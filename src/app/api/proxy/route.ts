import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
  }

  try {
    // 1. Nuestro servidor pide la foto a Zara (o quien sea)
    const response = await fetch(imageUrl);
    
    if (!response.ok) throw new Error('Error al descargar imagen');

    // 2. Convertimos la imagen a datos puros (ArrayBuffer)
    const imageBuffer = await response.arrayBuffer();

    // 3. Se la devolvemos a tu web "limpia" de bloqueos
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Access-Control-Allow-Origin': '*', // Permitimos todo
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'No se pudo obtener la imagen' }, { status: 500 });
  }
}