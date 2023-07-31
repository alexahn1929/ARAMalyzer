import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/summoner') {
    if (request.nextUrl.searchParams.get("summoner") !== null) {
      return NextResponse.redirect(new URL(`/summoner/${request.nextUrl.searchParams.get("summoner")}`, request.url));
    }
    else {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
}