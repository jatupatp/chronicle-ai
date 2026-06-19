import { ImageResponse } from 'next/og';

export const dynamic = 'force-dynamic';

// Cache the font in memory to prevent repeated network requests
let fontBuffer: ArrayBuffer | null = null;

async function getFontData(): Promise<ArrayBuffer> {
  if (fontBuffer) return fontBuffer;
  
  const res = await fetch('https://github.com/google/fonts/raw/main/ofl/prompt/Prompt-Bold.ttf');
  if (!res.ok) {
    throw new Error('Failed to fetch Prompt-Bold font from GitHub');
  }
  fontBuffer = await res.arrayBuffer();
  return fontBuffer;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || '';
    const imageUrl = searchParams.get('imageUrl') || '';

    // Load Thai font dynamically
    const fontData = await getFontData();

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            backgroundImage: imageUrl ? `url(${imageUrl})` : 'linear-gradient(to bottom, #111, #222)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          {/* Dark Overlay Gradient to make text readable */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.9) 95%)',
            }}
          />

          {/* Logo Watermark */}
          <div
            style={{
              position: 'absolute',
              top: 40,
              left: 40,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(79, 70, 229, 0.85)', // Accent Indigo
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: 'Prompt',
                letterSpacing: '1px',
              }}
            >
              CHRONICLE AI
            </span>
          </div>

          {/* Title Container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '40px 50px 50px 50px',
              width: '100%',
              zIndex: 10,
            }}
          >
            <h1
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.4,
                margin: 0,
                padding: 0,
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                fontFamily: 'Prompt',
              }}
            >
              {title}
            </h1>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 675,
        fonts: [
          {
            name: 'Prompt',
            data: fontData,
            style: 'normal',
            weight: 700,
          },
        ],
      }
    );
  } catch (e: any) {
    console.error('OG generation failed:', e);
    return new Response(`Failed to generate image: ${e.message}`, { status: 500 });
  }
}
