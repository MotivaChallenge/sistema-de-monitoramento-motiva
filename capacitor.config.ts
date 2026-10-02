import type { CapacitorConfig } from '@capacitor/cli';

// Build de release (GitHub Actions) define CAPACITOR_BUNDLED=true:
// o APK usa os arquivos do build (dist) em vez do servidor de desenvolvimento.
const bundled = process.env.CAPACITOR_BUNDLED === 'true';

const config: CapacitorConfig = {
  appId: 'app.lovable.p070ca8a99f494040a84b3259ebce1a4a',
  appName: 'sistema-de-monitoramento-motiva',
  webDir: 'dist',
  ...(bundled
    ? {}
    : {
        server: {
          url: 'https://070ca8a9-9f49-4040-a84b-3259ebce1a4a.lovableproject.com?forceHideBadge=true',
          cleartext: true,
        },
      }),
};

export default config;
