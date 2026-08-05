export async function paginate<T>(
  loader: Promise<T[]>,
  counter: Promise<number>,
  page: number,
  pageSize: number
) {
  const [
    data,
    total,
  ]=await Promise.all([
    loader,
    counter,
  ]);

  return{
    data,

    total,

    page,

    pageSize,

    totalPages:Math.ceil(
      total/pageSize
    )
  };
}