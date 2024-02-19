import '../styles.css';

import type { ReactNode } from 'react';

type RootLayoutProps = { children: ReactNode };

export const RootLayout = async ({ children }: RootLayoutProps) => {
  return (
    <div id="__waku" className="box-border font-['Nunito']">
      <main className="box-border flex items-center justify-center lg:min-h-svh">
        <div className="flex flex-col w-full min-h-[100vh] box-border">
          <div className="box-border relative py-4 md:py-16 daisy-hero bg-base-200">
            <div className="box-border text-center daisy-hero-content">
              <div className="box-border max-w-full md:max-w-4xl">
                <h1 className="text-5xl font-bold md:text-6xl">Waku Land</h1>
                <p className="pt-6 pb-2 text-lg md:text-xl ">
                  <i>Once every 6 hours</i>, we deploy the latest examples from
                  Waku's{' '}
                  <a
                    className="daisy-link daisy-link-primary"
                    href="https://github.com/dai-shi/waku"
                  >
                    main branch
                  </a>
                  .
                </p>
                <p className="px-4 pb-6 text-sm md:text-base md:px-16">
                  Waku Land was created by{' '}
                  <a
                    className="daisy-link-primary"
                    href="https://interbolt.org/"
                  >
                    InterBolt
                  </a>
                  , but Waku the library was created by{' '}
                  <a
                    className="daisy-link-primary"
                    href="https://twitter.com/dai_shi"
                  >
                    Daishi Kato
                  </a>
                  , who is also the creator of several popular React libraries,
                  such as{' '}
                  <a className="daisy-link-primary" href="https://jotai.org/">
                    Jotai
                  </a>
                  ,{' '}
                  <a
                    className="daisy-link-primary"
                    href="https://github.com/pmndrs/zustand"
                  >
                    Zustand
                  </a>
                  , and{' '}
                  <a
                    className="daisy-link-primary"
                    href="https://github.com/pmndrs/valtio"
                  >
                    Valtio
                  </a>
                  .
                </p>
                <div className="box-border flex justify-center w-full gap-4 px-4 pt-0 md:pt-4">
                  <a
                    href="https://waku.gg/"
                    className="flex daisy-btn grow md:grow-0 daisy-btn-neutral"
                  >
                    Waku's Website
                  </a>
                  <a
                    href="https://interbolt.ck.page/8e222f4c7a"
                    className="flex daisy-btn grow md:grow-0 daisy-btn-primary"
                  >
                    InterBolt's Newsletter
                  </a>
                </div>
              </div>
            </div>
          </div>
          <span id="content" />
          {children}
        </div>
      </main>
    </div>
  );
};
