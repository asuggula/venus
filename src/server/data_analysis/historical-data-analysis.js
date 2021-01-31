const dfd = require('danfojs-node');
const { Client, Pool } = require('pg');
require('dotenv').config();

//Specify table names
const THREE_MIN_TABLE = 'three_min_table';
const ONE_HR_TABLE = 'one_hour_table';
const EIGHT_HR_TABLE = 'eight_hour_table'
const ONE_DAY_TABLE = 'one_day_table';
const HOUR = 3600000
const EIGHT_HOURS = 28800000 


//Boilerplate to set up postgres db (client) object
const client = new Client({
  user: 'postgres', 
  host: 'rds-proxy-aurora-postgres.proxy-czysdiigcqcb.us-east-2.rds.amazonaws.com', 
  database: 'postgres', 
  password: 'lalalalovesong!', 
  port: 5432
})

client.connect();


const test = [
  {
    timestamp: '1612071042936-0',
      services: [
        {
          service: 'curriculum-api.codesmith.io',
          load: 15,
          response_time: 1198,
          error: 56,
          availability: 100,
          byMethod: {
            GET: {
            method: 'GET', 
            load: 20, 
            response_time: 1292, 
            availability: 299
            }, 
            PUT: {
              method: 'GET', 
              load: 20, 
              response_time: 1292, 
              availability: 299
            }, 
            POST: {
              method: 'GET', 
              load: 20, 
              response_time: 1292, 
              availability: 299
            } 
        },
      }
    ], 
    aggregate: {
      error: 56,
      load: 15,
      response_time: 1198,
      availability: 100,
      byMethod: { 
        GET: {
          load: 20, 
          response_time: 1292, 
          availability: 299
        } 
      }
    }
  },
  {
    timestamp: '1612071042999-0',
      services: [
        {
          service: 'curriculum-api.codesmith.io',
          load: 15,
          response_time: 1198,
          error: 56,
          availability: 100,
          byMethod: {
            GET: {
            method: 'GET', 
            load: 20, 
            response_time: 1292, 
            availability: 299
            }, 
            PUT: {
              method: 'GET', 
              load: 20, 
              response_time: 1292, 
              availability: 299
            }, 
            POST: {
              method: 'GET', 
              load: 20, 
              response_time: 1292, 
              availability: 299
            } 
        },
      }
    ], 
    aggregate: {
      error: 56,
      load: 15,
      response_time: 1198,
      availability: 100,
      byMethod: { 
        GET: {
          load: 20, 
          response_time: 1292, 
          availability: 299
        } 
      }
    }
  } 
]


//histWriteToDB takes in a buffer of 3 min "real-time" objects and writes them to the 3-min data base
const histWriteToDB = (buffer) => {

  let queryText = `INSERT INTO ${THREE_MIN_TABLE} (timestamp, service, method, availability, response_time, error_rate, load) VALUES `; 

  buffer.forEach((threeMinObj) => {
    
    console.log('threeMinObj', threeMinObj); 

    const timeStamp = convertUnixTime(threeMinObj.timestamp); 
    
    //Write the overall aggregate statistics for the 3 minute interval
    queryText += `('${timeStamp}', 'aggregate', 'aggregate', '${threeMinObj.aggregate.availability}', '${threeMinObj.aggregate.response_time}', '${threeMinObj.aggregate.error}', '${threeMinObj.aggregate.load}'),`;

    //Fill in all the aggregate rows by method

    console.log('byMethod for Aggregate at GET at availability:', threeMinObj.aggregate.byMethod.GET.availability); 

    for(let method in threeMinObj.aggregate.byMethod){
      console.log('method: ', method); 
      console.log('method level object: ', threeMinObj.aggregate.byMethod); 
      queryText += `('${timeStamp}', 'aggregate', '${method}', '${threeMinObj.aggregate.byMethod.method.availability}', '${threeMinObj.aggregate.byMethod.method.response_time}', '${threeMinObj.aggregate.byMethod.method.error}', '${threeMinObj.aggregate.byMethod.method.load}'),`;
    }
    
    //Fill in all the rows for aggregate at the service level and then by the method level
    threeMinObj.services.forEach((service) => {
      //Add aggregate service level metrics
      queryText += `('${timeStamp}', '${service.service}', 'aggregate', '${service.availability}', '${service.response_time}', '${service.error}', '${service.load}'),`;

      console.log('byMethod for Services:', service.byMethod);

      //Add service level metrics by method
      for(let method in service.byMethod){
        queryText += `('${timeStamp}', '${service.service}', '${method}', '${service.byMethod.method.availability}', '${service.byMethod.method.response_time}', '${service.byMethod.method.error}', '${service.byMethod.method.load}'),`;
      }
    })
  })
  
  //Modify the last comma and replace with a semi-colon
  queryText = queryText.slice(0, queryText.length - 1); 
  queryText += ';'; 


  client.query(queryText, (err, result) => {
    if(err){
      console.log(err); 
    } else {
      console.log(`Finished writing to ${THREE_MIN_TABLE}...`, result); 
    }
  })

  client.query('SELECT * FROM three_min_table;', (err, result) => {
    if(err){
      console.log(err); 
    } else {
      console.log(`${THREE_MIN_TABLE}...`, result.rows); 
    }
  })
}


//Function to convert unix time into a human readable timestamp
const convertUnixTime = (unixString) => {

  let unix = unixString.slice(0, unixString.length - 2);
  
  unix = new Number(unix); 

  const timeStamp = new Date(unix);
  
  return timeStamp.toLocaleString(); 
}

//Write a function that reads and analyzes the last hour of 3 minute rows
const readAndWriteLastHour = () => {
  //Query the three minute table for the last hour of data only at the aggregate level (not service level)
  // const selectAggregate = `SELECT * FROM ${THREE_MIN_TABLE} WHERE service = aggregate AND timestamp >= ${Date.now() - HOUR};`;
  //Analyze by aggregate, service and method
} 

//Write a function that reads and analyzes the last day of 1 hour rows
const readAndWriteLastDay = () => {
  
} 

//Write a function that reads and analyzes the last week of 8 hour rows
const readAndWriteLastWeek = () => {
  
} 

//Write a function that reads and analyzes the last month of 1 day rows
const readAndWriteLastMonth = () => {
  
} 


histWriteToDB(test); 