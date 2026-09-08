import { z } from "zod";

import { prisma } from "@/lib/prisma";

const MAX_ROWS = 500;
const COPY_CHUNK_SIZE = 5_000;

const rowSchema = z.object({
  accessionNo: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  isbn: z.string().trim().max(160).transform((value) => value || null),
  title: z.string().trim().min(2).max(240),
  author: z.string().trim().min(2).max(160),
  publisher: z.string().trim().max(160).transform((value) => value || null),
  edition: z.string().trim().max(160).transform((value) => value || null),
  shelf: z.string().trim().max(160).transform((value) => value || null),
  category: z.string().trim().max(100).transform((value) => value || null),
  copies: z.coerce.number().int().min(1).max(100),
});

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export async function importLibraryCatalog(schoolId: string, input: unknown) {
  if (!Array.isArray(input) || input.length === 0) throw new Error("No library books were provided.");
  if (input.length > MAX_ROWS) throw new Error(`Maximum ${MAX_ROWS} library rows per import.`);

  const rows = input.map((value, index) => {
    const parsed = rowSchema.safeParse(value);
    if (!parsed.success) throw new Error(`Row ${index + 2}: ${parsed.error.issues[0]?.message ?? "Invalid library book."}`);
    return parsed.data;
  });

  const accessions = new Set<string>();
  rows.forEach((row, index) => {
    if (accessions.has(row.accessionNo)) throw new Error(`Row ${index + 2}: Duplicate accession number ${row.accessionNo}.`);
    accessions.add(row.accessionNo);
  });

  const existingBooks = await prisma.libraryBook.findMany({
    where: { schoolId, accessionNo: { in: [...accessions] } },
    select: { accessionNo: true },
  });
  if (existingBooks.length) throw new Error(`A book already exists with accession number ${existingBooks[0].accessionNo}.`);

  return prisma.$transaction(async (tx) => {
    const existingCategories = await tx.libraryCategory.findMany({
      where: { schoolId },
      select: { id: true, name: true },
    });
    const categoryByName = new Map(existingCategories.map((item) => [normalize(item.name), item]));
    const missingCategoryNames = new Map<string, string>();
    for (const row of rows) {
      if (row.category && !categoryByName.has(normalize(row.category))) {
        missingCategoryNames.set(normalize(row.category), row.category);
      }
    }
    if (missingCategoryNames.size) {
      await tx.libraryCategory.createMany({
        data: [...missingCategoryNames.values()].map((name) => ({ schoolId, name })),
        skipDuplicates: true,
      });
    }

    const categories = await tx.libraryCategory.findMany({
      where: { schoolId },
      select: { id: true, name: true },
    });
    const resolvedCategoryByName = new Map(categories.map((item) => [normalize(item.name), item.id]));

    await tx.libraryBook.createMany({
      data: rows.map((row) => ({
        schoolId,
        accessionNo: row.accessionNo,
        isbn: row.isbn,
        title: row.title,
        author: row.author,
        publisher: row.publisher,
        edition: row.edition,
        shelf: row.shelf,
        categoryId: row.category ? resolvedCategoryByName.get(normalize(row.category)) ?? null : null,
      })),
    });

    const books = await tx.libraryBook.findMany({
      where: { schoolId, accessionNo: { in: [...accessions] } },
      select: { id: true, accessionNo: true },
    });
    const bookByAccession = new Map(books.map((book) => [book.accessionNo, book.id]));
    const copies = rows.flatMap((row) => {
      const bookId = bookByAccession.get(row.accessionNo);
      if (!bookId) throw new Error(`Unable to resolve imported book ${row.accessionNo}.`);
      return Array.from({ length: row.copies }, (_, index) => ({
        schoolId,
        bookId,
        barcode: `${row.accessionNo}-${String(index + 1).padStart(3, "0")}`,
      }));
    });
    for (let index = 0; index < copies.length; index += COPY_CHUNK_SIZE) {
      await tx.libraryBookCopy.createMany({ data: copies.slice(index, index + COPY_CHUNK_SIZE) });
    }

    return {
      booksCreated: rows.length,
      copiesCreated: copies.length,
      categoriesCreated: missingCategoryNames.size,
    };
  });
}
