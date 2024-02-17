'use client';

import deployments from '../../deployments.json';
import { useWindowSize } from 'usehooks-ts';

// I want a nice looking sidenav with the list of deployments
// The entire right side of the page should be an iframe filled with the deployment url

export const Screen = ({ flyName }: { flyName: string }) => {
  const screen = useWindowSize();
  const deployment = deployments.find((d) => d.flyName === flyName);
  return (
    <div
      style={{
        display: 'flex',
        boxSizing: 'border-box',
        width: screen.width,
        maxWidth: screen.width,
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          width: 300,
          height: screen.height,
          maxHeight: screen.height,
          overflowY: 'scroll',
          boxSizing: 'border-box',
          maxWidth: 300,
          overflowX: 'hidden',
        }}
        className="fixed top-0 left-0 bg-gray-200"
      >
        <h1>Waku Land</h1>
        <ul>
          {deployments.map((d, i) => {
            return (
              <li key={i}>
                <a href={`/?deployment=${d.flyName}`}>{d.dir}</a>
              </li>
            );
          })}
        </ul>
      </div>
      <div
        style={{
          width: screen.width - 300,
          left: 300,
          top: 0,
          boxSizing: 'border-box',
          maxWidth: screen.width - 300,
          overflowX: 'hidden',
          height: screen.height,
          maxHeight: screen.height,
          overflowY: 'hidden',
        }}
        className="absolute overflow-x-hidden"
      >
        {!deployment ? null : (
          <iframe
            src={`http://localhost:${deployment.servicePort}?deployment=${flyName}`}
            className="p-0 m-0 border-0"
            width={`${screen.width - 300}px`}
            height={`${screen.height}px`}
          />
        )}
      </div>
    </div>
  );
};
