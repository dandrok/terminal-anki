import { text, isCancel } from '@clack/prompts';
import { searchCards } from '../../features/flashcards/services/flashcard-service';
import { searchResults } from '../../ui/views/search-results';

export async function handleSearchCards(): Promise<void> {
  const query = await text({
    message: '◉ Search for:',
    placeholder: 'Enter search terms...'
  });

  if (!query || isCancel(query)) {
    return;
  }

  const results = searchCards(query as string);
  await searchResults(results, query as string);
}
