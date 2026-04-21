import { getCategories } from '@/src/app/lib/categories';

export async function GET() {
    const categories = await getCategories();
    return Response.json(categories);
}
