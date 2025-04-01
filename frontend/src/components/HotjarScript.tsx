'use client';

import Script from 'next/script';

// Hotjar tracking component
export default function HotjarScript() {
    // Get the Hotjar Site ID from environment variables or use the default
    const hotjarSiteId = process.env.NEXT_PUBLIC_HOTJAR_SITE_ID || '5357427';

    return (
        <>
            <Script
                id="hotjar-script"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
            (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                h._hjSettings={hjid:${hotjarSiteId},hjsv:6};
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `
                }}
            />
        </>
    );
} 