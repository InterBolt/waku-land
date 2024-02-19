import cluster from 'node:cluster';

const cache = {};

// Workers should never exit gracefully.
// Doing so should tell the primary process to die.
export const handleKill = () => {
  cluster.on('exit', (exitedWorker, code) => {
    if (code === 0) {
      console.error(
        `Worker ${exitedWorker.process.pid} died with code 0. Exiting...`
      );
      process.exit(1);
    }
  });
};

export const handleUnexpectedExit = () => {
  cluster.on('exit', (exitedWorker) => {
    const tag = cache[exitedWorker.process.pid];
    delete cache[exitedWorker.process.pid];
    console.log(`Worker with tag=${tag} died. Will restart if necessary.`);
    // The event handler might is async and its order not guaranteed.
    // So it's possible that the worker is already restarted by the time this line is executed.
    if (Object.values(cache).includes(tag)) {
      return;
    }
    spawn(tag);
  });
};

export const kill = () => {
  if (cluster.isPrimary) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

export const spawn = (tag) => {
  if (!cluster.isPrimary) {
    throw new Error(`A worker can't spawn another worker`);
  }
  const spawnedWorker = cluster.fork({ WAKU_TAG: tag });
  cache[spawnedWorker.process.pid] = tag;
  return spawnedWorker;
};

export const runPrimary = (fn) => {
  if (cluster.isPrimary) {
    fn();
  }
};

export const runWorker = (fn) => {
  if (cluster.isWorker) {
    fn();
  }
};

export const randomlyExitInTheFuture = () => {
  let restartTime = Math.random() * 1000 * 120 + 1000 * 45;
  if (process.env.NODE_ENV === 'production') {
    // Randomly between 30 - 60 minutes
    restartTime = Math.random() * 1000 * 60 * 60 + 1000 * 60 * 30;
  }
  // Kill the worker after a set amount of time
  // to prevent memory leaks.
  setTimeout(() => {
    console.log(`Worker ${process.pid} exiting as designed...`);
    process.exit(1);
  }, restartTime);
};
