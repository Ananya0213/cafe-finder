// This is a serverless function that runs on Vercel's backend.
// It is designed to securely fetch data from the Google Maps API.

export default async function handler(request, response) {
  // Get the latitude and longitude from the request URL
  const { lat, lng } = request.query;

  // Get the secure API key from Vercel's environment variables
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'API key is not configured.' });
  }

  // Construct the Google Maps API URL
  const endpoint = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&keyword=cafe&key=${apiKey}`;

  try {
    // Fetch data from Google's server. This is a server-to-server request, so there are no CORS issues.
    const res = await fetch(endpoint);
    const data = await res.json();
    
    // Send the data from Google back to our front-end application
    response.status(200).json(data);

  } catch (error) {
    // If something goes wrong, send an error message
    response.status(500).json({ error: 'Failed to fetch data from Google Maps API.' });
  }
}
