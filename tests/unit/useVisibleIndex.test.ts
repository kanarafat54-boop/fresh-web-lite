import { renderHook } from '@testing-library/react';
import { useVisibleIndex } from '../../src/components/Shorts/useVisibleIndex';

test('useVisibleIndex returns null when root not present', () => {
  const { result } = renderHook(() => useVisibleIndex('non-existent-root'));
  expect(result.current).toBeNull();
});
