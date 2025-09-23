// This is a temporary diagnostic function.
// It does NOT call the Google API. It returns hardcoded fake data.
// This is to test if the Vercel serverless function itself is working.

export default async function handler(request, response) {

  // Create fake cafe data to send back to the app.
  const fakeCafeData = {
    results: [
      {
        name: "SUCCESS: Vercel Function is Working!",
        place_id: "fake_place_id_1",
        photos: [{ photo_reference: "fake_photo_ref" }], // This will result in a broken image, which is expected.
        rating: 5.0,
        vicinity: "This fake data proves the problem is with the Google Cloud Project."
      },
      {
        name: "Test Cafe 2",
        place_id: "fake_place_id_2",
        photos: [{ photo_reference: "fake_photo_ref_2" }],
        rating: 4.5,
        vicinity: "Bhopal, Madhya Pradesh"
      }
    ]
  };

  // Send the fake data back to the browser.
  response.status(200).json(fakeCafeData);
}

