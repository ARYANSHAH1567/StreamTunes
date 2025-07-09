import { prismaClient } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import {z} from "zod";


const downvoteSchema = z.object({
    streamId: z.string(),
})

export async function POST(request: NextRequest) {
    const session = await getServerSession();
    //TODO: you can get rid of db call here

    const user = await prismaClient.user.findFirst({
        where: {
            email: session?.user?.email || ""
        }
    });

    if(!user) {
        return NextResponse.json({
            error: "Unauthorized",
            details: "You must be signed in to perform this action."
        }, {
            status: 401
        });
    }

    try {
        const data = downvoteSchema.parse(await request.json());
        await prismaClient.upvote.delete({
                where: {
                    //@ts-ignore
                    userId_streamId: {
                        userId: user.id,
                        streamId: data.streamId
                    }
                }
        });
        return NextResponse.json({
            message: "Downvote added successfully"
        }, {
            status: 200
        });
    } catch (error) {
        return NextResponse.json({
            error: "Error while adding upvote",
            details: error instanceof z.ZodError ? error.errors : "Unknown error"
        }, {
            status: 400
        });
    }
    
}