import { getProducts } from '@/src/app/lib/products';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const result = await getProducts({
        q: searchParams.get('q') ?? undefined,
        categoryId: searchParams.get('categoryId') ?? undefined,
        sort: searchParams.get('sort') ?? undefined,
        petType: searchParams.get('petType') ?? undefined,
        page: searchParams.get('page') ?? undefined,
    });
    return Response.json(result);
}
