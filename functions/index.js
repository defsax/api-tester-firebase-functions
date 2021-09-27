const functions = require("firebase-functions");
const axios = require("axios");
const cors = require("cors")({ origin: true });
// const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const TaskQueue = require("cwait").TaskQueue;

// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
const { firestore } = require("firebase-admin");

admin.initializeApp();
const database = admin.firestore();

const MAX_SIMULTANEOUS_DOWNLOADS = 1;

const apis = [
  // OTHER
  { get: "/api/v1/status" },

  // OSCAR REST APIS
  // { get: "/api/v1/oscarrest/providers" },
  // { get: "/api/v1/oscarrest/notes/1" },
  // { get: "/api/v1/oscarrest/patients" },
  // { get: "/api/v1/oscarrest/auth" },
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
    get: "/api/v1/oscar/patients/1/allergies",
  },
  {
    get: "/api/v1/oscar/patients/1/measurements",
  },
  {
    get: "/api/v1/oscar/patients/1/documents",
  },
  {
    get: "/api/v1/oscar/patients/1/forms",
  },
  {
    get: "/api/v1/oscar/patients/1/labResults",
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
    apiType: response.config.method,
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

// const postSlack = function (passes, fails, server) {
//   const msg = `API (${server.apitype}) Endpoint Results - ✅: ${passes}, ❌: ${fails}`;

//   axios({
//     method: "post",
//     url: functions.config().slack.devopsurl,
//     data: { text: msg },
//   })
//     .then((res) => {
//       console.log("Success posting to slack", res);
//     })
//     .catch((err) => {
//       console.log("Error posting to slack: ", err);
//     });
// };

const getAPIS = async function (server) {
  console.log(server.endpointURL + apis[0].get + server.suffix);
  let count = 0;
  let successes = 0;
  let failures = 0;

  const batch = database.batch();

  const queue = new TaskQueue(Promise, MAX_SIMULTANEOUS_DOWNLOADS);
  const results = await Promise.all(
    apis.map(
      queue.wrap(async (api) => {
        // console.log(
        //   "before axios:",
        //   "api:",
        //   api,
        //   "server:",
        //   server,
        //   "server.auth['headers']:" + server.auth["headers"]
        // );
        let result = {};
        try {
          const response = await axios({
            method: Object.keys(api)[0],
            url: server.endpointURL + Object.values(api)[0] + server.suffix,
            data: Object.values(api)[1],
            headers: server.auth["headers"],
          });
          console.log("axios returned:", response);
          result = createResult(response, api);
          successes++;
        } catch (err) {
          console.log("axios error:", err);
          result = createResult(err.response, api);
          failures++;
        }

        console.log("after axios");

        count++;

        // Add each result as an update to batch at our newEntry
        batch.update(server.docRef, {
          results: firestore.FieldValue.arrayUnion(result),
        });
      })
    )
  );

  // Promise.allSettled so that all promises are resolved, even if some fail

  console.log("Total tests: ", count);
  console.log("Total successes: ", successes);
  console.log("Total failures: ", failures);
  // update passes and fails
  batch.update(server.docRef, {
    passes: successes,
    fails: failures,
  });

  // Send successes and fails to slack devops channel
  // postSlack(successes, failures, server);

  // Commit all batch updates at once
  try {
    await batch.commit();
    console.log("batch committed.");
  } catch (err) {
    console.log("error committing batch", err);
  }
  // batch
  //   .commit()
  //   .then(() => {
  //     console.log("batch committed.");
  //   })
  //   .catch((err) => {
  //     console.log(err);
  //   });

  console.log(results);
};

exports.scheduledFunction = functions.pubsub
  .schedule("0 0,12 * * *")
  .timeZone("America/New_York")
  .onRun(async () => {
    const newDevDoc = database.collection("dev-test-results").doc(uuidv4());
    const newStagingDoc = database
      .collection("staging-test-results")
      .doc(uuidv4());

    // const signintoken = jwt.sign(
    //   {
    //     email: functions.config().kennedy.email,
    //     name: functions.config().kennedy.name,
    //   },
    //   "secretsignin"
    // );

    const servers = [
      {
        apitype: "dev",
        endpointURL: "https://kennedy-dev1.gojitech.systems",
        suffix:
          "?siteURL=" +
          encodeURIComponent("https://goji-oscar1.gojitech.systems") +
          "&appVersion=dev",
        docRef: newDevDoc,
        auth: {},
      },
      {
        apitype: "staging",
        endpointURL: "https://kennedy-staging1.gojitech.systems",
        suffix: "",
        docRef: newStagingDoc,
        auth: {},
      },
    ];

    // Setting a new entry is asynchronous, so create a promise for resolution
    const createDoc = new Promise((resolve, reject) => {
      newDevDoc
        .set({
          id: uuidv4(),
          timestamp: firestore.Timestamp.now(),
          results: [],
          passes: 0,
          fails: 0,
        })
        .then(() => {
          console.log("Dev document data set successfully.");
          resolve();
        })
        .catch((err) => {
          console.log("Error setting new document data.", err);
          reject(err);
        });
    });
    // Start a promise chain
    createDoc
      .then(() => {
        newStagingDoc
          .set({
            id: uuidv4(),
            timestamp: firestore.Timestamp.now(),
            results: [],
            passes: 0,
            fails: 0,
          })
          .then(() => {
            console.log("Staging document data set successfully.");
            return;
          })
          .catch((err) => {
            console.log("Error setting new document data.", err);
            return;
          });
      })
      .then(() => {
        // Get access token from dev server
        const url =
          "https://kennedy-dev1.gojitech.systems/api/v1/login" +
          servers[0].suffix;
        console.log(typeof url, url);

        return axios
          .post(url, {
            token: functions.config().google.token,
            // token: signintoken,
            providerNo: functions.config().kennedy.providerno.dev,
          })
          .then((res) => {
            if (res.data.profile.jwt) {
              console.log("Token approved.");

              const accessToken = res.data.profile.jwt;
              servers[0].auth = {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              };
            }
          })
          .catch((err) => {
            console.log("Error getting jwt approved:", err);
            throw new Error(err);
          });
      })
      .then(() => {
        // Create batch to update results and then write all results to the database at once
        // const batch = database.batch();

        servers.forEach((server) => {
          // let count = 0;
          // let successes = 0;
          // let failures = 0;

          getAPIS(server);

          // const delay = (milliseconds) =>
          //   new Promise((resolve) => setTimeout(resolve, milliseconds));

          // Loop through api list and queue up a list of promises to be resolved all at once
          // const promises = apis.map((api, i) => {
          //   let result = {};
          //   return delay(i * 1500).then(() => {
          //     return new Promise((resolve) => {
          //       console.log(
          //         server.endpointURL + Object.values(api)[0] + server.suffix
          //       );
          //       axios({
          //         method: Object.keys(api)[0],
          //         url:
          //           server.endpointURL + Object.values(api)[0] + server.suffix,
          //         data: Object.values(api)[1],
          //         headers: server[0].auth["headers"],
          //       })
          //         .then((res) => {
          //           successes++;
          //           result = createResult(res, api, server);
          //           return new Promise((resolve) =>
          //             setTimeout(resolve, i * 1500)
          //           );
          //         })
          //         .catch((err) => {
          //           failures++;
          //           console.log(err);
          //           result = createResult(err.response, api, server);
          //           return new Promise((resolve) =>
          //             setTimeout(resolve, i * 1500)
          //           );
          //         })
          //         .then(() => {
          //           count++;
          //           console.log("axios finished.");
          //           // Add each result as an update to batch at our newEntry

          //           batch.update(server.docRef, {
          //             results: firestore.FieldValue.arrayUnion(result),
          //           });

          //           resolve();
          //         });
          //     });
          //   });
          // });

          // // Promise.allSettled so that all promises are resolved, even if some fail
          // Promise.allSettled(promises).then(() => {
          //   console.log("Total tests: ", count);
          //   console.log("Total successes: ", successes);
          //   console.log("Total failures: ", failures);
          //   // update passes and fails
          //   batch.update(server.docRef, {
          //     passes: successes,
          //     fails: failures,
          //   });

          //   // Send successes and fails to slack devops channel
          //   // postSlack(successes, failures, server);

          //   // Commit all batch updates at once
          //   batch
          //     .commit()
          //     .then(() => {
          //       console.log("batch committed.");
          //     })
          //     .catch((err) => {
          //       console.log(err);
          //     });
          // });
        });
      })
      .catch((err) => {
        console.log(err);
      });

    return null;
  });

exports.login = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    // console.log(request.body);

    // const signintoken = jwt.sign(
    //   {
    //     email: request.body.email,
    //     name: request.body.name,
    //   },
    //   "secretsignin"
    // );
    // const provNO = functions.config().kennedy.providerno.dev;
    // console.log(request.body.response.tokenId);

    axios({
      method: "post",
      url:
        "https://kennedy-dev1.gojitech.systems/api/v1/login?siteURL=" +
        encodeURIComponent("https://goji-oscar1.gojitech.systems") +
        "&appVersion=dev",
      // url: "https://kennedy-staging1.gojitech.systems/api/v1/oscar/login",
      data: {
        token: request.body.response.tokenId,
        providerNo: "8",
      },
      // Headers: {
      //   Authorization: `Bearer ${request.body.tokenId}`,
      // },
    })
      .then((res) => {
        console.log("response", res);
        console.log("token", res.data.profile.jwt);
        axios({
          method: "post",
          url:
            "https://kennedy-dev1.gojitech.systems/api/v1/oscar/login?siteURL=" +
            encodeURIComponent("https://goji-oscar1.gojitech.systems") +
            "&appVersion=dev",
          // url: "https://kennedy-staging1.gojitech.systems/api/v1/oscar/login",
          data: {
            userName: "perry",
            password: "$%q6ZSDdNDd#6!eQ",
            pin: "4321",
          },
          Headers: {
            Authorization: `Bearer ${res.data.profile.jwt}`,
          },
        })
          .then((res) => {
            console.log("response", res);
          })
          .catch((err) => {
            console.log("error:", err.response);
            // throw new Error(err);
          });
      })
      .catch((err) => {
        console.log("error:", err.response);
        // throw new Error(err);
      });

    // const urlSuffix = "?siteURL=";
    // const versionSuffix = "&appVersion=" + request.body.appVersion;
    // const url =
    //   // "https://goji-oscar1.gojitech.systems/" +
    //   "https://kennedy-staging1.gojitech.systems/api/v1/login" +
    //   urlSuffix +
    //   encodeURIComponent(request.body.siteURL) +
    //   versionSuffix;
    // console.log(typeof url, url);

    // axios({
    //   method: "post",
    //   url: url,
    //   // url: "https://kennedy-dev1.gojitech.systems/api/v1/login",
    //   data: {
    //     token: signintoken,
    //     providerNo: "12",
    //   },
    //   // params: {
    //   //   siteURL: request.body.siteURL,
    //   //   appVersion: request.body.appVersion,
    //   // },
    //   // Headers: {
    //   //   "Content-Type": "application/json",
    //   // },
    // })
    //   .then((res) => {
    //     // functions.logger.info("response:", res.data, {
    //     //   structuredData: true,
    //     // });
    //     console.log(res.data);
    //     // response.send(res);
    //   })
    //   .catch((err) => {
    //     // functions.logger.info("error:", {
    //     //   structuredData: true,
    //     // });
    //     console.log(err);
    //     // response.send(err.response.data);
    //   });

    // response.send(request.body);
  });
});

// exports.decodeToken = functions.https.onRequest((request, response) => {
//   cors(request, response, () => {
//     const decoded = jwt.decode(request.body.token);
//     console.log(decoded);
//     response.send({ token: request.body.token, decoded: decoded });
//   });
// });

// exports.cors = functions.https.onRequest((request, response) => {
//   cors(request, response, () => {
//     console.log(request.body);
//     axios
//       .get(request.body.url)
//       .then((res) => {
//         // console.log(res);
//         response.send({ res });
//       })
//       .catch((err) => {
//         // console.log(err);
//         response.send({ err });
//       });
//   });
// });
