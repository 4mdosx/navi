import {NextRequest,NextResponse} from 'next/server';import {act,getToday,promoteTodo} from '@/backstage/execution/execution.service'
export async function GET(r:NextRequest){return NextResponse.json({success:true,data:await getToday(r.nextUrl.searchParams.get('date')||undefined)})}
export async function PATCH(r:NextRequest){const b=await r.json();return NextResponse.json({success:true,data:b.action==='promote'?await promoteTodo(b.todoId):await act(b.id,b.action)})}
