router.get("/analyze", authMiddleware, analyzeBodyType);
router.get("/occasion", authMiddleware, getOccasionRecommendation);
router.get("/mix-match", authMiddleware, getMixAndMatch);