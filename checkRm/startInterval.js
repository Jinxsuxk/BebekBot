function startMinuteInterval(fn) {
  const now = new Date();
  const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

  setTimeout(() => {
    fn();
    setInterval(fn, 60_000);
  }, msUntilNextMinute);
}

module.exports = {startMinuteInterval}