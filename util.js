const UTIL = {
  convertDateToStr : (date) =>{
    return date.toJSON().slice(0,10);
  },
  getCurrentDate : () => {
    let date = new Date();
    // console.log(date);
    return UTIL.convertDateToStr(date);

  },
};
