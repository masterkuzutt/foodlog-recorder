const UTIL = {
  getCurrentDate : () => {
    let date = new Date();
    return [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
      ].join( '/' );
  }
};
