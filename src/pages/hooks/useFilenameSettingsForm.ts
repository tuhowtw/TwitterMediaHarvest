/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { ISettingsVORepository } from '#domain/repositories/settings'
import { FilenameSetting } from '#domain/valueObjects/filenameSetting'
import type { AggregationToken } from '#domain/valueObjects/filenameSetting'
import type PatternToken from '#enums/patternToken'
import { getText as i18n } from '#libs/i18n'
import type { HelperMessage } from '#pages/components/controls/featureControls'
import type {
  InitPayloadAction,
  PayloadAction,
  PureAction,
} from '#pages/types/reducerAction'
import { useCallback, useEffect, useReducer, useState } from 'react'

type DirectorySetAction = PayloadAction<'setDirectory', string>

type Directory2SetAction = PayloadAction<'setDirectory2', string>

type FilenamePatternSetAction = PayloadAction<
  'setFilenamePattern',
  PatternToken[]
>

type AggregationTokenSetAction = PayloadAction<
  'setAggregationToken',
  AggregationToken
>

type FilenameSettingsPureAction = PureAction<
  'toggleDirectory' | 'toggleFileAggregation'
>

type FilenameSettingsAction =
  | FilenameSettingsPureAction
  | PayloadAction<'reset', FilenameSetting>
  | InitPayloadAction<FilenameSetting>
  | DirectorySetAction
  | Directory2SetAction
  | FilenamePatternSetAction
  | AggregationTokenSetAction

type FormStatusAction = PureAction<
  | 'directoryIsInvalid'
  | 'directoryIsValid'
  | 'directory2IsInvalid'
  | 'directory2IsValid'
  | 'filenamePatternIsInvalid'
  | 'filenamePatternIsValid'
  | 'formIsChanged'
  | 'formIsNotChanged'
  | 'init'
>

type FormStatus = {
  dataIsChanged: boolean
  directoryIsValid: boolean
  directory2IsValid: boolean
  filenamePatternIsValid: boolean
  isLoaded: boolean
}

const defaultFormStatus: FormStatus = {
  dataIsChanged: false,
  directoryIsValid: true,
  directory2IsValid: true,
  filenamePatternIsValid: true,
  isLoaded: false,
}

function formStatusReducer(
  formStatus: FormStatus,
  action: FormStatusAction
): FormStatus {
  switch (action.type) {
    case 'directoryIsInvalid':
      return {
        ...formStatus,
        directoryIsValid: false,
      }

    case 'directoryIsValid':
      return {
        ...formStatus,
        directoryIsValid: true,
      }

    case 'directory2IsInvalid':
      return {
        ...formStatus,
        directory2IsValid: false,
      }

    case 'directory2IsValid':
      return {
        ...formStatus,
        directory2IsValid: true,
      }

    case 'filenamePatternIsInvalid':
      return {
        ...formStatus,
        filenamePatternIsValid: false,
      }

    case 'filenamePatternIsValid':
      return {
        ...formStatus,
        filenamePatternIsValid: true,
      }

    case 'formIsChanged':
      return {
        ...formStatus,
        dataIsChanged: true,
      }

    case 'formIsNotChanged':
      return {
        ...formStatus,
        dataIsChanged: false,
      }

    case 'init':
      return {
        ...formStatus,
        isLoaded: true,
      }
  }
}

function settingReducer(
  settings: FilenameSetting,
  action: FilenameSettingsAction
): FilenameSetting {
  const settingProps = settings.mapBy(props => props)
  switch (action.type) {
    case 'toggleDirectory':
      return new FilenameSetting({
        ...settingProps,
        noSubDirectory: !settingProps.noSubDirectory,
      })

    case 'toggleFileAggregation':
      return new FilenameSetting({
        ...settingProps,
        fileAggregation: !settingProps.fileAggregation,
      })

    case 'setDirectory':
      return new FilenameSetting({ ...settingProps, directory: action.payload })

    case 'setDirectory2':
      return new FilenameSetting({
        ...settingProps,
        directory2: action.payload,
      })

    case 'setFilenamePattern':
      return new FilenameSetting({
        ...settingProps,
        filenamePattern: action.payload,
      })

    case 'setAggregationToken':
      return new FilenameSetting({ ...settingProps, groupBy: action.payload })

    case 'init':
      return action.payload

    case 'reset':
      return action.payload
  }
}

const isValidFormStatus = (status: FormStatus) =>
  status.directoryIsValid && status.filenamePatternIsValid

type FormMessage = {
  directory: HelperMessage | undefined
  filenamePattern: HelperMessage | undefined
}

type PatternTokenState = 'enable' | 'disable'

type FormHandler = {
  submit: () => Promise<void>
  reset: () => void
  setDirectory: (directory: string) => void
  setDirectory2: (directory: string) => void
  toggleSubDirectory: () => void
  changePatternTokenState: (
    state: PatternTokenState
  ) => (token: PatternToken) => void
  /**
   * - If `sourceIndex` is out of range, do nothing.
   * - If *`destinationIndex < 0`*, the source element will be inserted into the begining of array.
   * - If *`desitnationIndex > maximum index`*, the source element will be appended to the end of array.
   *
   * @param sourceIndex source index in pattern array.
   * @param destinationIndex destination index in pattern array.
   */
  sortPatternToken: (sourceIndex: number, destinationIndex: number) => void
  setAggregationToken: (aggregationToken: AggregationToken) => void
  toggleAggregationToken: () => void
}

const useFilenameSettingsForm = (
  filenameSettingsRepo: ISettingsVORepository<FilenameSetting>
): {
  filenameSetting: FilenameSetting
  status: FormStatus
  message: FormMessage
  handler: FormHandler
} => {
  const [filenameSettings, settingsDispatch] = useReducer(
    settingReducer,
    filenameSettingsRepo.getDefault()
  )
  const [formStatus, formStatusDispatch] = useReducer(
    formStatusReducer,
    defaultFormStatus
  )
  const [directoryMessage, setDirectoryMessage] = useState<
    undefined | HelperMessage
  >(undefined)
  const [patternMessage, setPatternMessage] = useState<
    undefined | HelperMessage
  >(undefined)

  useEffect(() => {
    filenameSettingsRepo.get().then(settings => {
      settingsDispatch({ type: 'init', payload: settings })
      formStatusDispatch({ type: 'init' })
    })
  }, [filenameSettingsRepo])

  const submit = useCallback(async () => {
    if (
      !isValidFormStatus(formStatus) ||
      filenameSettings.validate() !== undefined
    )
      return
    await filenameSettingsRepo.save(filenameSettings)
    formStatusDispatch({ type: 'formIsNotChanged' })
  }, [filenameSettingsRepo, filenameSettings, formStatus])

  const reset = useCallback(() => {
    settingsDispatch({
      type: 'reset',
      payload: filenameSettingsRepo.getDefault(),
    })
    formStatusDispatch({ type: 'formIsChanged' })
  }, [filenameSettingsRepo])

  const setDirectory = useCallback((directory: string) => {
    const invalidDirectoryReason = FilenameSetting.validateDirectory(directory)
    const isValidDirectory = invalidDirectoryReason === undefined

    formStatusDispatch({ type: 'formIsChanged' })
    formStatusDispatch({
      type: isValidDirectory ? 'directoryIsValid' : 'directoryIsInvalid',
    })
    setDirectoryMessage(
      isValidDirectory
        ? undefined
        : {
            type: 'error',
            content: i18n(
              'Invalid directory name. Cannot contain <>:"\\|?*',
              'options:general'
            ),
          }
    )
    settingsDispatch({ type: 'setDirectory', payload: directory })
  }, [])

  const setDirectory2 = useCallback((directory: string) => {
    // Empty string is allowed (means "no folder B, fall back to folder A")
    if (directory !== '') {
      const invalidReason = FilenameSetting.validateDirectory(directory)
      const isValid = invalidReason === undefined
      formStatusDispatch({
        type: isValid ? 'directory2IsValid' : 'directory2IsInvalid',
      })
      if (!isValid) {
        settingsDispatch({ type: 'setDirectory2', payload: directory })
        formStatusDispatch({ type: 'formIsChanged' })
        return
      }
    } else {
      formStatusDispatch({ type: 'directory2IsValid' })
    }
    formStatusDispatch({ type: 'formIsChanged' })
    settingsDispatch({ type: 'setDirectory2', payload: directory })
  }, [])

  const toggleSubDirectory = useCallback(() => {
    formStatusDispatch({ type: 'formIsChanged' })
    settingsDispatch({ type: 'toggleDirectory' })
  }, [])

  const changePatternTokenState = useCallback(
    (state: PatternTokenState) => (token: PatternToken) => {
      const pattern = filenameSettings.mapBy(props => props.filenamePattern)
      const newPattern =
        state === 'enable'
          ? pattern.includes(token)
            ? pattern
            : pattern.concat([token])
          : pattern.filter(v => v !== token)

      const invalidReason = FilenameSetting.validateFilenamePattern(newPattern)
      const isPatternValid = invalidReason === undefined

      formStatusDispatch({
        type: isPatternValid
          ? 'filenamePatternIsValid'
          : 'filenamePatternIsInvalid',
      })
      settingsDispatch({
        type: 'setFilenamePattern',
        payload: newPattern,
      })
      setPatternMessage(
        isPatternValid
          ? undefined
          : {
              type: 'error',
              content: i18n(
                'Invalid pattern. The pattern must include `Tweet ID` + `Serial` or `Hash`.',
                'options:general'
              ),
            }
      )

      formStatusDispatch({ type: 'formIsChanged' })
    },
    [filenameSettings]
  )
  /**
   * @see {@link FormHandler#sortPatternToken} for implementation details
   */
  const sortPatternToken = useCallback(
    (sourceIndex: number, destinationIndex: number) => {
      const newPattern = filenameSettings.mapBy(props => props.filenamePattern)
      const [target] = newPattern.splice(sourceIndex, 1)
      if (target === undefined) return

      newPattern.splice(Math.max(0, destinationIndex), 0, target)
      formStatusDispatch({ type: 'formIsChanged' })
      settingsDispatch({
        type: 'setFilenamePattern',
        payload: newPattern,
      })
    },
    [filenameSettings]
  )

  const setAggregationToken = useCallback(
    (aggregationToken: AggregationToken) => {
      settingsDispatch({
        type: 'setAggregationToken',
        payload: aggregationToken,
      })
      formStatusDispatch({ type: 'formIsChanged' })
    },
    []
  )

  const toggleAggregationToken = useCallback(() => {
    settingsDispatch({
      type: 'toggleFileAggregation',
    })
    formStatusDispatch({ type: 'formIsChanged' })
  }, [])

  return {
    filenameSetting: filenameSettings,
    status: formStatus,
    message: { directory: directoryMessage, filenamePattern: patternMessage },
    handler: {
      submit,
      reset,
      setDirectory,
      setDirectory2,
      toggleSubDirectory,
      changePatternTokenState,
      sortPatternToken,
      setAggregationToken,
      toggleAggregationToken,
    },
  }
}

export default useFilenameSettingsForm
