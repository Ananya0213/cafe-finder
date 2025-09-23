// Vercel Serverless Function to get detailed information for a specific cafe.
// This function securely uses the API key from environment variables.

export default async function handler(request, response) {
  const { placeId } = request.query;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'API key is not configured.' });
  }

  const fields = 'name,formatted_phone_number,website,opening_hours,formatted_address';
  const endpoint = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

  try {
    const googleResponse = await fetch(endpoint);
    const data = await googleResponse.json();
    response.status(200).json(data);
  } catch (error) {
    response.status(500).json({ error: 'Failed to connect to the Place Details API.' });
  }
}