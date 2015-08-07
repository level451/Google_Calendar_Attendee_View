var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly','https://www.google.com/m8/feeds','https://www.googleapis.com/auth/drive'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
//var TOKEN_PATH = TOKEN_DIR + 'calendar-api-quickstart.json';
var TOKEN_PATH = 'calendar-api-quickstart.json';


start();
setInterval(function(){start(); }, 1000*60*60);

function start() {
// Load client secrets from a local file.
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        // Authorize a client with the loaded credentials, then call the
        // Google Calendar API.
        authorize(JSON.parse(content), gcMain);
    });
}
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {



  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
        //console.log();

    console.log("credentials expire at:",new Date(oauth2Client.credentials.expiry_date));

    if (oauth2Client.credentials.expiry_date-new Date()>60000) {
        console.log("Minutes remaining:"+(oauth2Client.credentials.expiry_date-new Date())/60000);

        callback(oauth2Client);

    }else
    {

        console.log("Access taken expired refreshing access token");
        oauth2Client.refreshAccessToken(function(err, tokens) {
            // your access_token is now refreshed and stored in oauth2Client
            console.log(err,tokens);
             if (err){
                 console.log("Error getting new access token:",err)

             }else
            console.log("refreshed access token");
            storeToken(oauth2Client.credentials);
            console.log("Minutes remaining:"+(oauth2Client.credentials.expiry_date-new Date())/60000);

            callback(oauth2Client);

            // store these new tokens in a safe place (e.g. database)

        });

  //      callback(oauth2Client);

    }

    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    console.log("inputed code:"+code);
      oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function gcMain(auth) {
    var googleContacts = require('google-contacts-oauth');

    var opts = {
        token: auth.credentials.access_token

    };
    googleContacts(opts, function (err, contactData) {
        if (err){

            console.log('Error - on reading contacts:',err)
        }else
        {
            // ok got the contact data:
            console.log('Number of Contacts received:' +(contactData.length),contactData[0].email.toLowerCase());
            var calendar = google.calendar('v3');
            x = new Date()
            calendar.events.list({
                auth: auth,
                calendarId: 'primary',
                timeMin: (new Date(2015,x.getMonth(), x.getDate()-1)).toISOString(), // first day of month 7
                timeMax: (new Date(2015,8,1)).toISOString(), // last day of month 7
                maxResults: 1000,
                singleEvents: true,
                orderBy: 'startTime'
            }, function(err, response) {
                if (err) {
                    console.log('The Calendar API returned an error: ' + err);
                    return;
                }
                var events = response.items;
                if (events.length == 0) {
                    console.log('No upcoming events found.');
                } else {
                    var outfile = '';
                    var textDay=["Sun","Mon","Tue","Wed","Thur","Fri","Sat"];

                    console.log('Events found:',events.length);
                    for (var i = 0; i < events.length; i++) {
                        var event = events[i];
                        var start = new Date(event.start.dateTime) || event.start.date;
                        var end = new Date(event.end.dateTime) || event.start.date;
                        outfile = outfile + '"' + (start.getMonth() + 1) + '/' + start.getDate() + ' ' + start.getHours() + ':' + start.getMinutes() + '-' + end.getHours() + ':' + end.getMinutes() + '",' + textDay[start.getDay()] + ',';
                        outfile = outfile + event.summary + ',';
                        process.stdout.write(".");
                        //  console.log(event.summary);
                        //console.log(start +'-'+ end);

                        if ( typeof event.attendees != 'undefined'){
                        for (var x = 0; x < event.attendees.length; x++) {
                            var name = event.attendees[x].email;
                            // try to resolve the name from the email
                            for (var y = 0; y < contactData.length; ++y) {

                                if (typeof contactData[y].email != 'undefined' && (event.attendees[x].email.toLowerCase() == contactData[y].email.toLowerCase())) { // match calendar email with contacts email
                                    name = contactData[y].name;
                                    process.stdout.write("+");

                                    //process.stdout.write('found@'+name+'/r');
                                    break;

                                }
                            }

                            outfile = outfile + name + ',' + event.attendees[x].responseStatus + ',';

                            //   console.log(name+' '+event.attendees[x].email);
                        }
                    }else
                        {
                            // no attendees
                            console.log("No attendes:",event);



                        }

                        outfile=outfile+'\r\n'
                    }
                    //  console.log(events[1]);

//        fs.writeFile("E:/ServerFolders/Users/Todd/Google Drive/Missionary/Calendar/calendar.csv", outfile, function(err) {
//            if(err) {
//                return console.log(err);
//            }
//
//            console.log("The file was saved!");
                    //       });

                    var service = google.drive('v2');

//        service.files.insert({
                    service.files.update({
                            auth: auth,
                            fileId:'0ByAeyQIq3nQzVjZQWk9mSk5TWm8',
                            newRevision: true,
                            resource: {
                                title: 'Missionary Calendar',
                                mimeType: 'text/csv'
                            },media: {
                                mimeType: 'text/csv',
                                body:outfile
                            }


                        },function(err,response){
                            if (err) {
                                console.log('The file update API returned an error: ' + err);
                                return;
                            }
                            console.log('The file update API returned : ' + response);

                        }


                    )

                }
            });












        }



    });








}

function contact(auth) {
    console.log(auth.credentials.access_token);
//    return



    var googleContacts = require('google-contacts-oauth');

    var opts = {
        token: auth.credentials.access_token

    };
    googleContacts(opts, function (err, contactData) {
        console.log(err, contactData.length);
    });
//
//    var GoogleContacts = require('google-contacts-api');
//    var contacts = new GoogleContacts({ token : 'ya29.xwFT9D33K6w4GK0jxIzFVPJ0kdiJTgqTjuE7tZRzZ_hEXs_FlWkpWFdIDwr_iTxLSdKL' });
//    contacts.getContacts(function(err, contacts) {
//        console.log(err,contacts)
//        // ...
//    });
//


}