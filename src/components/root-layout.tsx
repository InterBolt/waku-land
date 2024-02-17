import '../styles.css';

import type { ReactNode } from 'react';

type RootLayoutProps = { children: ReactNode };

export const RootLayout = async ({ children }: RootLayoutProps) => {
  return (
    <div id="__waku" className="font-nunito">
      {/* <meta property="description" content={data.description} />
      <link rel="icon" type="image/png" href={data.icon} /> */}
      <main className="flex items-center justify-center lg:min-h-svh">
        {children}
      </main>
    </div>
  );
};
