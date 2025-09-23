// This is the main serverless function to find cafes near a given location.
// It securely uses the API key from environment variables.

export default async function handler(request, response) {
  const { lat, lng } = request.query;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'API key not configured.' });
  }

  const endpoint = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&keyword=cafe&key=${apiKey}`;

  try {
    const googleResponse = await fetch(endpoint);
    const data = await googleResponse.json();
    
    if (data.error_message) {
      console.error("Google API Error:", data.error_message);
      return response.status(500).json({ error: 'Google API Error', details: data.error_message });
    }

    response.status(200).json(data);

  } catch (error) {
    response.status(500).json({ error: 'Failed to connect to the Places API.' });
  }
}