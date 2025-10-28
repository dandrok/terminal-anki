export interface CardStats {
  totalCards: number;
  dueCards: number;
  totalReviews: number;
  averageEasiness: number;
  distribution: {
    new: number;
    learning: number;
    young: number;
    mature: number;
  };
}
