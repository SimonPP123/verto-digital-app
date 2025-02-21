const ChatSession = require('../models/ChatSession');

const rateLimit = (req, res, next) => {
    // Get the chat session from the request body
    const { sessionId } = req.body;
    
    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
    }

    // Check if the session is currently processing
    ChatSession.findById(sessionId)
        .then(session => {
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }

            if (session.isProcessing) {
                return res.status(429).json({ error: 'Previous request still processing' });
            }

            // If not processing, continue
            next();
        })
        .catch(err => {
            console.error('Error checking session processing state:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
};

module.exports = rateLimit; 