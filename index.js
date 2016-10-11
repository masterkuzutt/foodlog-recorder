const NDBURL = 'http://api.nal.usda.gov/ndb/';

// api requests
function searchFoodData(searchword,cb,cbNodata){
    $.ajax({
      method: 'GET',
      url: NDBURL + 'search',
      data: {
        format :'json',
        ds : 'Standard Reference',
        q :searchword,
        max : 25,
        offset : 0,
        api_key : NDBAPIKEY
      }
    })
    .done( (data) => {
      if(typeof data.list !== "undefined"){
        data.list.item.forEach (cb);
      }else{
        cbNodata();
      }
    })
    .error();
};

// cb have to accept one argument.
function getReport(ndbno,cb) {
  $.ajax({
    method: "GET",
    url: NDBURL + 'reports',
    data : {
      ndbno   : ndbno,
      type    : 'b',
      format  : 'json',
      api_key : NDBAPIKEY
    }
  })
  .done( (data) => {
    cb(data);
  })
  .error((data) => {
  });
};

//*********
//strorage functions

function writeStorage(instance,key,data,cb){
  //[TODO] add functionality to check key exsist or not
  instance.setItem(key,data).then(cb);

};

function getStorageKey(instance){
  let keys = [];
  for (let i = 0 ; i < window.localStorage.length ;i++){
      keys.push(window.localStorage.key(i));
  }
  return keys;
};


function readStorageData(instance,key,cb){
  let data = instance.getItem(key);
  data.then(cb);
};

function readAllStorageData(instance,cb){
  instance.keys().then((keys) =>{
    keys.forEach( (key) =>{
      readStorageData(instance,key,cb);
    });
  });
}

function checkIfStorageData(key,data){

}

function deleteStorageData(instance,key,cb){
  instance.removeItem(key,cb);
}

// DataModel class
class FoodDataModel{
    constructor (){
      //basicInfo
      this.ndbno = "";
      this.group = "";
      this.name = "";
      this.nutrtions = [];
      this.amount = 100;

    }
    set basicData(item){
      this.ndbno  = item.ndbno;
      this.group =  item.group;
      this.name  =  item.name;
      this.nutrtions = {};
    }
    set nutritionData(data){
      data.forEach((nutorition) => {
        this.nutrtions[nutorition.group] = this.nutrtions[nutorition.group] || [] ;
        this.nutrtions[nutorition.group].push(
          {
             name:nutorition.name,
             unit:nutorition.unit,
             value:nutorition.value
          }
       );
      });
    }
    get  proximates () {
        let proximatesObj ={};
        //  console.log("inside getter !");
         this.nutrtions.Proximates.forEach((nt) => {
            if ( nt.name ==="Water")  proximatesObj.water =  nt.value * this.amount / 100;
            if ( nt.name ==="Energy" )  proximatesObj.energy =  nt.value * this.amount / 100;
            if ( nt.name ==="Protein" ) proximatesObj.protain = nt.value * this.amount / 100;
            if ( nt.name ==="Total lipid (fat)" ) proximatesObj.lipid = nt.value * this.amount / 100;
            if ( nt.name ==="Carbohydrate, by difference" ) proximatesObj.carbo = nt.value * this.amount / 100;
            if ( nt.name ==="Fiber, total dietary" ) proximatesObj.fiber = nt.value * this.amount / 100;
            if ( nt.name ==="Sugars, total" ) proximatesObj.sugar = nt.value * this.amount / 100;
        });
        return proximatesObj;
    };


};

//ViewModel class singleton pattern
let viewModel = new class {

  constructor(){
    this.searchResult =ko.observableArray([]);
    this.foodData = ko.observableArray([]);
    this.foodRecodeDay = ko.observableArray([]);
    this.foodRecode = ko.observableArray([]);
    this.searchQuery = ko.observable("");
    this.selectedDate = ko.observable(UTIL.getCurrentDate());
    this.foodDataDB = localforage.createInstance({
      name: "foodDataDB"
    });

    this.foodRecodeDB = localforage.createInstance({
      name: "foodRecodeDB"
    });

    this.amountQuery = ko.observable("");

  }

  init(){
    this.loadFoodData();
    // this.loadFoodRecode();
  }

  loadFoodData(){
    this.foodData([]);
    readAllStorageData(this.foodDataDB,(data) => {
      if (data !== null  ){
        this.foodData.push(data);
      }
    });
  }

  // binds to search Button
  searchFood() {
    this.searchResult([]);

    searchFoodData(this.searchQuery,
      (item)=>{
        this.searchResult.push(this.createTmpFoodData(item));
      },
      () =>{
        this.searchResult.push(this.createTmpFoodData({ndbno:"no recode found"}));
      }
    );
  }
  clearSearchData(){
    this.searchResult([]);
  }

  storeFoodData(item){

    getReport(item.ndbno ,
      (data) => {
        let food = new  FoodDataModel();
        food.basicData = data.report.food;
        //[TODO] data format is defined by model. don't need to care structure of data here
        food.nutritionData = data.report.food.nutrients

        // [TODO]need some research wtat is happining
        // bind inside premise object callback , this refer different object
        writeStorage(this.foodDataDB,food.ndbno,food,this.loadFoodData.bind(this));
      }
    );
  }

  deleteFoodData(item){
    deleteStorageData(this.foodDataDB,item.ndbno,this.loadFoodData.bind(this));
  }

  createTmpFoodData(item){
    return {
      ndbno:item.ndbno,
      group:item.group || "",
      name: item.name || ""
    }
  }

  //food recode functions
  loadFoodRecode(){
    let currentDate = this.selectedDate();
    this.foodRecode([]);

    readStorageData(this.foodRecodeDB,currentDate,(data) => {
      if ( data){
        data.forEach( (item) => {
          // var tmp = $.extend(new FoodDataModel(),item);
          // console.log(tmp);
          this.foodRecode.push($.extend(new FoodDataModel(),item));
         });
      }
    });
  }

  searchFoodRecode(){
  }

  storeFoodRecode(item){
    this.foodRecode.push($.extend(new FoodDataModel(),item));
    writeStorage(this.foodRecodeDB,this.selectedDate(),this.foodRecode());
  }

  updateAmount(item,index,value){
    // item.amount = num ;
    item.amount = value;
    this.foodRecode.splice(index(),1)
    this.foodRecode.push(item);
    writeStorage(this.foodRecodeDB,this.selectedDate(),this.foodRecode());
  }

  deleteFoodRecode(index){
    this.foodRecode.splice(index,1);
    writeStorage(this.foodRecodeDB,this.selectedDate(),
                 this.foodRecode(),this.loadFoodRecode.bind(this)
                );
  };

  getFoodRecodeSum(){
      let obj = {
        energy : 0,
        protain:0,
        lipid : 0,
        carbo : 0
      };

      for ( let i = 0 ; i < this.foodRecode().length ; i++){
        // console.log("in","proximates",this.foodRecode()[i].proximates,"done");
        let food = this.foodRecode()[i] ;
        obj.energy += food.proximates.energy;
        obj.protain += food.proximates.protain;
        obj.lipid += food.proximates.lipid;
        obj.carbo += food.proximates.carbo;
      };
      // console.log(obj);
      return obj;
  }

  createFoodRecodeBarChart(elm){

    let obj = this.getFoodRecodeSum(),
        data = [
          {w:obj.carbo, x:0, c:"red"},
          {w:obj.protain,x:obj.carbo, c:"green"},
          {w:obj.lipid,x:obj.carbo + obj.protain, c:"black"}
        ];
    let sum = obj.carbo + obj.protain + obj.lipid;

    let scale = d3.scaleLinear().domain([0,sum]);

    if( $(elm).children().length === 0 ){
      d3.select(elm).append("svg")
      .attr("width",'95%')
      .attr("height",'50px')
      .attr("class","sammary-graph-svg")
      .attr("preserveAspectRatio", "xMinYMin meet")
      // .attr("viewBox", "0 0 1000 100")
      .style("border", "1px solid black")
      // .append("g")
      .selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      ;
    }

    let svg = d3.select(elm).select("svg");
    scale.range([0,parseInt(svg.style('width'))]);

    svg.selectAll('rect')
      .data(data)
      .attr("width", (d)=> {return scale(d.w) })
      .attr("height",(d)=> {return 50})
      .attr("x",(d)=> {return scale(d.x)})
      .style("fill", (d)=> {return d.c})
    ;



  };

  debugPrint (text){
    console.log(text);
    return text;
  }



}();

//report

ko.applyBindings(viewModel);
viewModel.init();
