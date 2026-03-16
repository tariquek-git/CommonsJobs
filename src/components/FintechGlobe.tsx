import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

interface FintechGlobeProps {
  className?: string;
}

export default function FintechGlobe({ className }: FintechGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phiRef = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const width = 600;
    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.04, 0.15, 0.25],
      markerColor: [0.39, 0.36, 1],
      glowColor: [0.25, 0.12, 0.4],
      markers: [
        { location: [40.7128, -74.006], size: 0.07 }, // NYC
        { location: [51.5074, -0.1278], size: 0.06 }, // London
        { location: [1.3521, 103.8198], size: 0.05 }, // Singapore
        { location: [43.6532, -79.3832], size: 0.05 }, // Toronto
        { location: [37.7749, -122.4194], size: 0.06 }, // SF
        { location: [-33.8688, 151.2093], size: 0.04 }, // Sydney
        { location: [35.6762, 139.6503], size: 0.05 }, // Tokyo
        { location: [22.3193, 114.1694], size: 0.05 }, // Hong Kong
      ],
      onRender: (state) => {
        state.phi = phiRef.current;
        phiRef.current += 0.003;
      },
    });

    // Pause when not visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (canvasRef.current) {
          canvasRef.current.style.display = entry.isIntersecting ? 'block' : 'none';
        }
      },
      { threshold: 0.1 },
    );

    if (canvasRef.current) {
      observer.observe(canvasRef.current);
    }

    return () => {
      globe.destroy();
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: 600, height: 600, maxWidth: '100%', aspectRatio: '1' }}
    />
  );
}
