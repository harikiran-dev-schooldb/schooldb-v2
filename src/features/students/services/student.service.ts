import { prisma } from "@/lib/prisma";

export async function getStudents(schoolId:string){

    return prisma.student.findMany({

        where:{
            schoolId,
            active:true
        },

        orderBy:{
            createdAt:"desc"
        }

    });

}