// Vercel Serverless Function to convert a location query (e.g., "mumbai") into coordinates.
// This function securely uses the API key from environment variables.

export default async function handler(request, response) {
  const { query } = request.query;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'API key is not configured.' });
  }

  const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;

  try {
    const googleResponse = await fetch(endpoint);
    const data = await googleResponse.json();
    response.status(200).json(data);
  } catch (error) {
    response.status(500).json({ error: 'Failed to connect to the Geocoding API.' });
  }
}