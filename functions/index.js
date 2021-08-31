const functions = require("firebase-functions");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
const { firestore } = require("firebase-admin");
admin.initializeApp();
const database = admin.firestore();

const apiVersion = [
  "https://kennedy-dev1.gojitech.systems",
  "https://kennedy-dev2.gojitech.systems",
];

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

const createResult = function (response) {
  return {
    // id
    id: uuidv4(),
    // timestamp
    timestamp: firestore.Timestamp.now(),
    // endpoint URL
    endpointURL: response.config.url,
    // api type (dev/staging/production) -> to begin with, everything is dev
    apiType: "dev",
    // status
    status: response.status,
    // data
    // data: response.data,
  };
};

exports.scheduledFunction = functions.pubsub
  .schedule("0 * * * *")
  .onRun((context) => {
    console.log("This should run every 12 hours!");
    const promises = [];
    let count = 0;

    const jwt = require("jsonwebtoken");
    const signintoken = jwt.sign(
      {
        email: functions.config().kennedy.email,
        name: functions.config().kennedy.name,
      },
      "secretsignin"
    );

    // const newLogin = new Promise((resolve, reject) => {
    //   axios
    //     .post("https://kennedy-dev1.gojitech.systems/api/v1/login", {
    //       token: signintoken,
    //       providerNo: functions.config().kennedy.providerno,
    //     })
    //     .then((res) => {
    //       if (res.data.profile.jwt) {
    //         console.log("Token approved.");

    //         const accessToken = res.data.profile.jwt;
    //         const auth = {
    //           headers: {
    //             Authorization: `Bearer ${accessToken}`,
    //           },
    //         };

    //         resolve(auth);
    //       }
    //     })
    //     .catch((err) => {
    //       console.log(err);
    //       // reject(err);
    //     });
    // });

    // newLogin.then((auth) => {
    //   return axios
    //     .post(
    //       "https://kennedy-dev1.gojitech.systems/api/v1/oscar/login",
    //       {
    //         userName: functions.config().kennedy.name,
    //         password: functions.config().kennedy.password,
    //         pin: functions.config().kennedy.pin,
    //       },
    //       auth // auth token
    //     )
    //     .then((res) => {
    //       console.log("logged into oscar:", res);
    //       const newID = uuidv4();
    //       const newEntry = database.collection("test-results").doc(newID);

    //       newEntry
    //         .set({
    //           id: uuidv4(),
    //           timestamp: firestore.Timestamp.now(),
    //           results: [],
    //         })
    //         .then(() => {
    //           console.log("Document data set successfully.");
    //           const batch = database.batch();

    //           apis.forEach((api) => {
    //             if (Object.keys(api)[0] === "get") {
    //               let result = {};

    //               promises.push(
    //                 axios
    //                   .get(currentApi + Object.values(api)[0], auth)
    //                   .then((res) => {
    //                     result = createResult(res);
    //                   })
    //                   .catch((err) => {
    //                     console.log(err);
    //                     result = createResult(err.response);
    //                   })
    //                   .then(() => {
    //                     count++;
    //                     console.log("axios finished.");
    //                     batch.update(
    //                       database.collection("test-results").doc(newID),
    //                       {
    //                         results: firestore.FieldValue.arrayUnion(result),
    //                       }
    //                     );
    //                   })
    //               );
    //             }
    //           });

    //           Promise.allSettled(promises).then((resultstest) => {
    //             console.log(resultstest);
    //             console.log(count);
    //             batch
    //               .commit()
    //               .then(() => {
    //                 console.log("batch committed.");
    //               })
    //               .catch((err) => {
    //                 console.log(err);
    //               });
    //           });
    //         })
    //         .catch((err) => {
    //           console.log("Error setting new document data:", err);
    //         });
    //     });
    // });

    const newID = uuidv4();
    const newEntry = database.collection("test-results").doc(newID);

    const createDoc = new Promise((resolve, reject) => {
      newEntry
        .set({
          id: uuidv4(),
          timestamp: firestore.Timestamp.now(),
          results: [],
        })
        .then(() => {
          console.log("Document data set successfully.");

          resolve();
        })
        .catch((err) => {
          console.log("Error setting new document data:", err);
        });
    });
    createDoc
      .then(() => {
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
            console.log(err);
            return;
          });
      })
      .then((auth) => {
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
            console.log(err);
            return;
          });
      })
      .then((auth) => {
        const batch = database.batch();

        apis.forEach((api) => {
          if (Object.keys(api)[0] === "get") {
            let result = {};

            promises.push(
              axios
                .get(currentApi + Object.values(api)[0], auth)
                .then((res) => {
                  result = createResult(res);
                })
                .catch((err) => {
                  console.log(err);
                  result = createResult(err.response);
                })
                .then(() => {
                  count++;
                  console.log("axios finished.");
                  batch.update(database.collection("test-results").doc(newID), {
                    results: firestore.FieldValue.arrayUnion(result),
                  });
                })
            );
          }
        });

        Promise.allSettled(promises).then((resultstest) => {
          console.log(resultstest);
          console.log(count);
          batch
            .commit()
            .then(() => {
              console.log("batch committed.");
            })
            .catch((err) => {
              console.log(err);
            });
        });
      });

    return null;
  });
