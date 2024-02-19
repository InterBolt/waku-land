'use client';

import { clsx } from 'clsx';
import deployments from '../../deployments.json';
import { useWindowSize } from 'usehooks-ts';
import { useState } from 'react';
import { getSourceUrl, getUrl } from './utils.js';

type Deployment = (typeof deployments)[0];

export const HomeScreen = ({
  url: initialUrl,
  sourceUrl: initialSourceUrl,
  deployment: initialDeployment,
}: {
  url: string;
  sourceUrl: string;
  deployment: Deployment;
}) => {
  const [deployment, setDeployment] = useState(initialDeployment);
  const [sourceUrl, setSourceUrl] = useState(initialSourceUrl);
  const [url, setUrl] = useState(initialUrl);
  return (
    <div className="box-border min-h-[100vh] flex flex-col gap-4 p-4 md:flex-row">
      <div className="flex-col hidden md:flex shrink">
        <ul className="flex flex-col w-full p-4 daisy-menu bg-base-200 rounded-box">
          {deployments.map((d, i) => (
            <li key={`example-${i}`}>
              <button
                className={clsx(
                  d.flyName === deployment.flyName ? 'daisy-active' : ''
                )}
                onClick={() => {
                  setSourceUrl(getSourceUrl(d));
                  setUrl(getUrl(d));
                  setDeployment(d);
                  window.open('#content', '_self');
                }}
              >
                {`examples/${d.dir}`}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex w-full shrink md:hidden">
        <ChangeWakuButton />
        <dialog
          id="mobile_picker"
          className="flex items-center justify-center w-full h-full bg-black md:hidden daisy-modal modal-bottom daisy-modal-middle"
        >
          <div className="p-0 daisy-modal-box">
            <form
              method="dialog"
              className="flex justify-end w-full p-4 bg-base-100"
            >
              {/* if there is a button in form, it will close the modal */}
              <button className="daisy-btn daisy-btn-sm daisy-btn-circle daisy-btn-ghost">
                ✕
              </button>
            </form>
            <form method="dialog">
              <ul className="daisy-menu bg-base-200 daisy-rounded-box">
                {deployments.map((d, i) => (
                  <li key={`example-${i}`}>
                    <button
                      className={clsx(
                        d.flyName === deployment.flyName ? 'daisy-active' : ''
                      )}
                      onClick={() => {
                        setSourceUrl(getSourceUrl(d));
                        setUrl(getUrl(d));
                        setDeployment(d);
                        window.open('#content', '_self');
                        console.log(
                          document.getElementById('mobile_picker') as any
                        );
                      }}
                    >{`examples/${d.dir}`}</button>
                  </li>
                ))}
              </ul>
            </form>
          </div>
        </dialog>
      </div>
      <div className="flex flex-col grow">
        <WakuIframe sourceUrl={sourceUrl} url={url} />
      </div>
    </div>
  );
};

const WakuIframe = ({ url, sourceUrl }: { url: string; sourceUrl: string }) => {
  const screen = useWindowSize();
  const desktop = (
    <div className="box-border relative hidden md:flex grow daisy-mockup-window bg-base-300">
      <div className="absolute top-0 flex items-center justify-center h-12 right-2">
        <a
          href={sourceUrl}
          target="_blank"
          className="daisy-btn daisy-btn-sm daisy-btn-link"
        >
          Source code
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
            />
          </svg>
        </a>
        <a
          href={url}
          target="_blank"
          className="daisy-btn daisy-btn-sm daisy-btn-link"
        >
          Open in new tab
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
        </a>
      </div>
      <iframe width="100%" height="100%" src={url} />
    </div>
  );
  const mobile = (
    <div className="box-border relative flex md:hidden daisy-mockup-window bg-base-300">
      <div className="absolute top-0 flex items-center justify-center h-12 right-2">
        <a
          href={sourceUrl}
          target="_blank"
          className="daisy-btn daisy-btn-sm daisy-btn-link"
        >
          Source
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
            />
          </svg>
        </a>
        <a
          href={url}
          target="_blank"
          className="daisy-btn daisy-btn-sm daisy-btn-link"
        >
          Open
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
        </a>
      </div>
      <iframe width="100%" height={screen.width * 1.5} src={url} />
    </div>
  );
  return (
    <>
      {desktop}
      {mobile}
    </>
  );
};

const ChangeWakuButton = () => {
  return (
    <button
      className="flex w-full daisy-btn"
      onClick={() => {
        (document.getElementById('mobile_picker') as any)?.showModal?.();
      }}
    >
      Change Waku Example
    </button>
  );
};
