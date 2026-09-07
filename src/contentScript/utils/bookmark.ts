/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { $ } from 'select-dom'

/**
 * Clicks X's own "Remove from Bookmarks" button for the post the given
 * harvest button belongs to, if that post is currently bookmarked.
 *
 * X only renders `[data-testid="removeBookmark"]` when the post is
 * bookmarked (it's `[data-testid="bookmark"]` otherwise), so its presence
 * doubles as the "is this post bookmarked" check.
 *
 * @param button A harvester button element (`.harvester`).
 * @returns `true` if the bookmark button was found and clicked, `false`
 * otherwise (not bookmarked, or the action bar couldn't be located).
 */
export const removeBookmarkFromHarvesterButton = (
  button: HTMLElement
): boolean => {
  try {
    const actionBar = button.closest<HTMLElement>('[role="group"]')
    if (!actionBar) return false

    const removeBookmarkButton = $<HTMLElement>(
      '[data-testid="removeBookmark"]',
      actionBar
    )
    if (!removeBookmarkButton) return false

    removeBookmarkButton.click()
    return true
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    return false
  }
}
