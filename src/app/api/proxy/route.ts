import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
  }

  try {
    // 1. Pedimos la foto a la web original
    const response = await fetch(imageUrl);
    
    if (!response.ok) throw new Error('Error al descargar imagen');

    // 2. Convertimos a datos puros
    const imageBuffer = await response.arrayBuffer();

    // 3. Devolvemos la imagen con permisos abiertos
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Access-Control-Allow-Origin': '*', 
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'No se pudo obtener la imagen' }, { status: 500 });
  }
}