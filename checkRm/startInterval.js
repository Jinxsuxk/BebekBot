function startMinuteInterval(fn) {
  const now = new Date();
  const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

  // first call at start of next minute
  setTimeout(() => {
    fn();

    // then repeat every full minute
    setInterval(fn, 60_000);
  }, msUntilNextMinute);
}

module.exports = {startMinuteInterval}