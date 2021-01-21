const { read } = require('fs');
const Redis = require('ioredis');
const { Client } = require('pg'); 

//Name of stream we are reading from
const STREAM_KEY = process.env.STREAM_KEY; 
//Interval of the stream we are processing to write to the database
const INTERVAL = process.env.INTERVAL;
//Rate at which we want to query the stream for data
const PING_RATE = process.env.PING_RATE; 
//Where Redis is being hosted (either local machine or elasticache)
const REDIS_HOST = process.env.REDIS_HOST; 
// const REDIS_HOST = 'localhost'

const DB_NAME = process.env.DB_NAME; 

const TABLE_NAME = process.env.TABLE_NAME; 

const REGION = process.env.REGION; 

const redis = new Redis({
  port: 6379, 
  host: REDIS_HOST
});

// const docClient = new dynamodb.DocumentClient({region: REGION}); 

const client = new Client({
  user: 'postgres', 
  host: 'log-database-1.cluster-czysdiigcqcb.us-east-2.rds.amazonaws.com', 
  database: 'postgres', 
  password: 'NMnNA2IXwfuyJcyPyBen', 
  port: 5432
})

client.connect(); 

console.log(`Reading the stream named ${STREAM_KEY}...`); 

const readAndWriteToDB = async () => {

  //Write to the database
  client.query('SELECT * FROM logs', (err, result) => {
    if(err){
      console.log(err); 
    } else {
      console.log(`Finished reading ${DB_NAME}...`, result); 
    }
  })

  //Get the milliseconds for start and end time
  const startTime = Date.now() - INTERVAL; 
  const endTime = startTime + INTERVAL;  

    //Transform xrange's output from two arrays of keys and value into one array of log objects
    Redis.Command.setReplyTransformer('xrange', function (result) {
      if(Array.isArray(result)){
        const newResult = []; 
        for(const r of result){
          const obj = {
            id: r[0]
          }; 
  
          const fieldNamesValues = r[1]; 
  
          for(let i = 0; i < fieldNamesValues.length; i += 2){
            const k = fieldNamesValues[i]; 
            const v = fieldNamesValues[i + 1]; 
            obj[k] = v; 
          }
  
          newResult.push(obj); 
        }
  
        return newResult; 
      }
  
      return result; 
    }); 

  //QUERY STREAM

  streamEntries = await redis.xrange(STREAM_KEY, startTime, endTime);

  console.log('XRANGE, response with reply transformer'); 
  // //real-time entries should be sent for processing elsewhere 
  console.log(streamEntries); 

  //WRITE TO THE DATABASE

  let queryText = `INSERT INTO ${TABLE_NAME} (redis_timestamp, req_method, req_host, req_path, req_url, res_status_code, res_message, cycle_duration) VALUES `; 

  if(streamEntries.length !== 0){

    console.log(`Writing to table ${DB_NAME}...`); 

    streamEntries.forEach( (log) => {
      // console.log('log: ', log); 
      queryText += `('${log.id}', '${log.reqMethod}', '${log.reqHost}', '${log.reqPath}', '${log.reqURL}', '${log.resStatusCode}', '${log.resMessage}', '${log.cycleDuration}'),`; 
    })
  
    //Modify the last comma and replace with a semi-colon
    queryText = queryText.slice(0, queryText.length - 1); 
    queryText += ';'; 
  
    //Write to the database
    client.query(queryText, (err, result) => {
      if(err){
        console.log(err); 
      } else {
        console.log(`Finished writing to ${DB_NAME}...`, result); 
      }
    })
  }
}

try {
  setInterval(async () => { await readAndWriteToDB() }, PING_RATE); 
} catch (e) {
  console.error(e); 
}