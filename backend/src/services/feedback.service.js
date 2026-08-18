const feedbackStore = [];

export const saveFeedback = (payload) => {
  const {
    rating = 5,
    comments = '',
    farmerName = 'Anonymous',
    phone = '',
    district = '',
  } = payload;

  const entry = {
    id: `FB-${Date.now()}`,
    rating: Number(rating),
    comments,
    farmerName,
    phone,
    district,
    submittedAt: new Date().toISOString(),
  };

  feedbackStore.push(entry);

  return {
    status: 'recorded',
    feedbackId: entry.id,
    message: 'Thank you for your feedback! Your inputs help improve fertilizer recommendations.',
  };
};

export default {
  saveFeedback,
};
