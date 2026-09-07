/**
 * @jest-environment jsdom
 */
import { removeBookmarkFromHarvesterButton } from './bookmark'

const makeActionBar = (): { actionBar: HTMLElement; button: HTMLElement } => {
  const actionBar = document.createElement('div')
  actionBar.setAttribute('role', 'group')

  const button = document.createElement('div')
  button.className = 'harvester'
  actionBar.appendChild(button)

  document.body.appendChild(actionBar)

  return { actionBar, button }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('removeBookmarkFromHarvesterButton', () => {
  it('clicks the remove-bookmark button and returns true when the post is bookmarked', () => {
    const { actionBar, button } = makeActionBar()
    const removeBookmarkButton = document.createElement('div')
    removeBookmarkButton.setAttribute('data-testid', 'removeBookmark')
    const handleClick = jest.fn()
    removeBookmarkButton.addEventListener('click', handleClick)
    actionBar.appendChild(removeBookmarkButton)

    const result = removeBookmarkFromHarvesterButton(button)

    expect(result).toBe(true)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does nothing and returns false when the post is not bookmarked', () => {
    const { actionBar, button } = makeActionBar()
    const bookmarkButton = document.createElement('div')
    bookmarkButton.setAttribute('data-testid', 'bookmark')
    const handleClick = jest.fn()
    bookmarkButton.addEventListener('click', handleClick)
    actionBar.appendChild(bookmarkButton)

    const result = removeBookmarkFromHarvesterButton(button)

    expect(result).toBe(false)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('returns false without throwing when there is no action bar ancestor', () => {
    const button = document.createElement('div')
    button.className = 'harvester'
    document.body.appendChild(button)

    expect(() => removeBookmarkFromHarvesterButton(button)).not.toThrow()
    expect(removeBookmarkFromHarvesterButton(button)).toBe(false)
  })
})
