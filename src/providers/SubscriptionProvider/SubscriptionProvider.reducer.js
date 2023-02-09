import {
  UPDATE_IS_ON_TRIAL_PERIOD,
  UPDATE_ANDROID_SUBSCRIPTION_STATE,
  UPDATE_SUBSCRIBER_ID,
  UPDATE_IS_SUBSCRIBED,
  UPDATE_SUBSCRIPTION,
  UPDATE_SUBSCRIPTION_ERROR,
  SHOW_PREMIUM_REQUIRED,
  HIDE_PREMIUM_REQUIRED,
  NOT_SUBSCRIBED
} from './SubscriptionProvider.constants';
import { LOGOUT } from '../../components/Account/Login/Login.constants';

const initialState = {
  subscriberId: '',
  androidSubscriptionState: NOT_SUBSCRIBED,
  isSubscribed: false,
  expiryDate: null,
  error: {
    isError: false,
    code: '',
    message: ''
  },
  premiumRequiredModalState: {
    open: false,
    showTryPeriodFinishedMessages: false
  }
};

function subscriptionProviderReducer(state = initialState, action) {
  switch (action.type) {
    case UPDATE_IS_ON_TRIAL_PERIOD:
      return {
        ...state,
        isOnTrialPeriod: action.isOnTrialPeriod
      };
    case UPDATE_ANDROID_SUBSCRIPTION_STATE:
      return {
        ...state,
        androidSubscriptionState: action.payload
      };
    case UPDATE_SUBSCRIBER_ID:
      return {
        ...state,
        subscriberId: action.payload
      };
    case UPDATE_IS_SUBSCRIBED:
      return {
        ...state,
        isSubscribed: action.payload
      };
    case UPDATE_SUBSCRIPTION:
      const {
        expiryDate,
        isSubscribed,
        androidSubscriptionState
      } = action.payload;
      return {
        ...state,
        expiryDate,
        isSubscribed,
        androidSubscriptionState
      };
    case UPDATE_SUBSCRIPTION_ERROR:
      const { showError, code, message } = action.payload;
      return {
        ...state,
        error: {
          showError: showError,
          code: code,
          message: message
        }
      };
    case LOGOUT:
      return initialState;
    case SHOW_PREMIUM_REQUIRED:
      return {
        ...state,
        premiumRequiredModalState: {
          open: true,
          showTryPeriodFinishedMessages: action.showTryPeriodFinishedMessages
        }
      };
    case HIDE_PREMIUM_REQUIRED:
      return {
        ...state,
        premiumRequiredModalState: {
          open: false,
          showTryPeriodFinishedMessages:
            state.premiumRequiredModalState.showTryPeriodFinishedMessages
        }
      };
    default:
      return state;
  }
}

export default subscriptionProviderReducer;
