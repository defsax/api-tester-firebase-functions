const functions = require("firebase-functions");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const cors = require("cors")({ origin: true });
const { v4: uuidv4 } = require("uuid");

// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
const { firestore } = require("firebase-admin");
admin.initializeApp();
const database = admin.firestore();

const apiVersion = [
  {
    apitype: "dev",
    endpointURL: "https://kennedy-dev1.gojitech.systems",
  },
  {
    apitype: "staging",
    endpointURL: "https://kennedy-dev2.gojitech.systems",
  },
];

// switch here to change from dev to staging
const currentApi = apiVersion[0];

const apis = [
  // OTHER
  { get: "/api/v1/status" },

  // OSCAR REST APIS
  { get: "/api/v1/oscarrest/providers" },
  { get: "/api/v1/oscarrest/notes/1" },
  {
    post: "/api/v1/oscar/prescriptions",
    body: [
      {
        demographicNo: 0,
        drugs: [
          {
            drugId: 0,
            providerNo: 0,
            brandName: "string",
            takeMin: 0,
            takeMax: 0,
            rxDate: "2021-07-08T16:05:49.404Z",
            endDate: "2021-07-08T16:05:49.404Z",
            frequency: "",
            duration: 0,
            durationUnit: "",
            route: "",
            method: "",
            prn: false,
            repeats: 0,
            quantity: 0,
            instructions: "string",
            additionalInstructions: "",
            archived: false,
            archivedReason: "",
            archivedDate: null,
            strength: 0,
            strengthUnit: "",
            externalProvider: "",
            longTerm: true,
            noSubstitutions: true,
          },
        ],
      },
    ],
  },
  { get: "/api/v1/oscarrest/patients" },
  { get: "/api/v1/oscarrest/auth" },

  // PATIENTS
  { get: "/api/v1/oscar/patients" },
  {
    post: "/api/v1/oscar/patients",
    body: {
      firstName: "James",
      lastName: "Alex",
      email: "james.alex@gmail.com",
      sex: "M",
      dateOfBirth: "1978-12-31T00:00:00.000Z",
      address: {
        province: "ON",
        postal: "M6H 2L9",
        city: "Toronto",
        address: "92 Auburn Ave",
      },
    },
  },
  { get: "/api/v1/oscar/patients/all" },
  { get: "/api/v1/oscar/patients/1" },
  {
    get: "/api/v1/oscar/patients/14/allergies",
  },
  {
    get: "/api/v1/oscar/patients/14/measurements",
  },
  {
    get: "/api/v1/oscar/patients/14/documents",
  },
  {
    get: "/api/v1/oscar/patients/14/forms",
  },
  {
    get: "/api/v1/oscar/patients/14/labResults",
  },
];

const createResult = function (response, api) {
  return {
    // id
    id: uuidv4(),
    // timestamp
    timestamp: firestore.Timestamp.now(),
    // endpoint URL
    endpointURL: response.config.url,
    // api type (dev/staging/production) -> to begin with, everything is dev
    apiType: currentApi.apitype,
    // apiURL
    apiURL: Object.values(api)[0],
    // method
    method: Object.keys(api)[0],
    // status
    status: response.status,
    // data
    data: response.data,
  };
};

const postSlack = function (passes, fails) {
  const msg = `API (${currentApi.apitype}) Endpoint Results - ✅: ${passes}, ❌: ${fails}`;

  axios({
    method: "post",
    url: functions.config().slack.devopsurl,
    data: { text: msg },
  })
    .then((res) => {
      console.log("Success posting to slack", res);
    })
    .catch((err) => {
      console.log("Error posting to slack: ", err);
    });
};

exports.scheduledFunction = functions.pubsub
  .schedule("0 0,12 * * *")
  .timeZone("America/New_York")
  .onRun(() => {
    const promises = [];
    let count = 0;
    let successes = 0;
    let failures = 0;

    const signintoken = jwt.sign(
      {
        email: functions.config().kennedy.email,
        name: functions.config().kennedy.name,
      },
      "secretsignin"
    );

    const newID = uuidv4();
    const newEntry = database.collection("test-results").doc(newID);

    // Setting a new entry is asynchronous, so create a promise for resolution
    const createDoc = new Promise((resolve, reject) => {
      newEntry
        .set({
          id: uuidv4(),
          timestamp: firestore.Timestamp.now(),
          results: [],
          passes: 0,
          fails: 0,
        })
        .then(() => {
          console.log("Document data set successfully.");
          resolve();
        })
        .catch((err) => {
          console.log("Error setting new document data.");
          reject(err);
        });
    });
    // Start a promise chain
    createDoc
      .then(() => {
        // Get access token from kennedy dev server
        return axios
          .post("https://kennedy-dev1.gojitech.systems/api/v1/login", {
            token: signintoken,
            providerNo: functions.config().kennedy.providerno,
          })
          .then((res) => {
            if (res.data.profile.jwt) {
              console.log("Token approved.");

              const accessToken = res.data.profile.jwt;
              const auth = {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              };
              return auth;
            }
          })
          .catch((err) => {
            console.log("Error getting jwt approved:", err);
            return;
          });
      })
      .then((auth) => {
        // Sign in to oscar server
        return axios
          .post(
            "https://kennedy-dev1.gojitech.systems/api/v1/oscar/login",
            {
              userName: functions.config().kennedy.name,
              password: functions.config().kennedy.password,
              pin: functions.config().kennedy.pin,
            },
            auth // auth token
          )
          .then((res) => {
            console.log("logged into oscar:", res);
            return auth;
          })
          .catch((err) => {
            console.log("Error logging into oscar:", err);
            return;
          });
      })
      .then((auth) => {
        // Create batch to update results and then write all results to the database at once
        const batch = database.batch();

        // Loop through api list and queue up a list of promises to be resolved all at once
        apis.forEach((api) => {
          let result = {};

          promises.push(
            axios({
              method: Object.keys(api)[0],
              url: currentApi.endpointURL + Object.values(api)[0],
              data: Object.values(api)[1],
              headers: auth["headers"],
            })
              .then((res) => {
                successes++;
                result = createResult(res, api);
              })
              .catch((err) => {
                failures++;
                console.log(err);
                result = createResult(err.response, api);
              })
              .then(() => {
                count++;
                console.log("axios finished.");

                // Add each result as an update to batch at our newEntry
                batch.update(database.collection("test-results").doc(newID), {
                  results: firestore.FieldValue.arrayUnion(result),
                });
              })
          );
        });

        // Promise.allSettled so that all promises are resolved, even if some fail
        Promise.allSettled(promises).then(() => {
          console.log("Total tests: ", count);
          console.log("Total successes: ", successes);
          console.log("Total failures: ", failures);
          // update passes and fails
          batch.update(database.collection("test-results").doc(newID), {
            passes: successes,
            fails: failures,
          });

          // Send successes and fails to slack devops channel
          postSlack(successes, failures);

          // Commit all batch updates at once
          batch
            .commit()
            .then(() => {
              console.log("batch committed.");
            })
            .catch((err) => {
              console.log(err);
            });
        });
      })
      .catch((err) => {
        console.log(err);
      });

    return null;
  });

exports.login = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    functions.logger.info("Request:", request.body, {
      structuredData: true,
    });

    const signintoken = jwt.sign(
      {
        email: request.email,
        name: request.name,
      },
      "secretsignin"
    );

    axios
      .post("https://kennedy-dev1.gojitech.systems/api/v1/login", {
        token: signintoken,
        providerNo: "8",
      })
      .then((res) => {
        response.send(res);
        functions.logger.info("response:", res.data, {
          structuredData: true,
        });
      })
      .catch(() => {
        // response.send(err.response.data);
        functions.logger.info("error:", {
          structuredData: true,
        });
      });

    // response.send("Firebase");
  });
});

exports.decodeToken = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    const decoded = jwt.decode(request.body.token);
    console.log(decoded);
    // const concat =
    //   "https://oauth2.googleapis.com/tokeninfo?id_token=" + request.body.token;
    // axios
    //   .post(concat)
    //   .then((res) => {
    //     console.log(res);
    //   })
    //   .catch((err) => console.log(err));

    response.send({ "token:": request.body.token, " decoded:": decoded });
  });
});
