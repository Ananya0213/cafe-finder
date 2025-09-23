// This is an enhanced version of our serverless function with detailed error logging.

export default async function handler(request, response) {
  const { lat, lng } = request.query;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    // If the key isn't found in Vercel, send a specific error.
    return response.status(500).json({ 
      error: 'Server Error: API key is not configured in Vercel environment variables.' 
    });
  }

  const endpoint = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&keyword=cafe&key=${apiKey}`;

  try {
    const googleResponse = await fetch(endpoint);
    const data = await googleResponse.json();

    // **THIS IS THE NEW, IMPORTANT PART**
    // If Google's server sends back an error message in its response,
    // we will catch it and send it to your browser's console.
    if (data.error_message) {
      console.error("Google API Error:", data.error_message);
      return response.status(500).json({ 
        error: 'An error occurred with the Google API.', 
        details: data.error_message, // This will tell us the exact problem
        status: data.status
      });
    }
    
    // If everything is okay, send the cafe data back.
    response.status(200).json(data);

  } catch (error) {
    // If the fetch call itself fails, log that error.
    console.error("Fetch Error:", error);
    response.status(500).json({ 
      error: 'Failed to connect to the Google Maps API.',
      details: error.message
    });
  }
}

