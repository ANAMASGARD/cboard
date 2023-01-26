import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import Subscribe from './Subscribe.component';
import { getUser, isLogged } from '../../App/App.selectors';
import API from '../../../api';

import { isAndroid } from '../../../cordova-util';
import { AVAIABLE_PRODUCTS_ID } from './Subscribe.constants';
import {
  comprobeSubscription,
  updateSubscriberId,
  updateSubscription,
  updateAndroidSubscriptionState,
  updateSubscriptionError
} from '../../../providers/SubscriptionProvider/SubscriptionProvider.actions';

export class SubscribeContainer extends PureComponent {
  static propTypes = {
    history: PropTypes.object.isRequired,
    subscription: PropTypes.object.isRequired
  };

  state = {
    name: this.props.user.name,
    email: this.props.user.email,
    products: []
  };

  componentDidMount() {
    if (isAndroid()) {
      window.CdvPurchase.store.when('subscription').updated(this.setProducts);
      this.props.comprobeSubscription();
    }
    this.setProducts();
  }

  setProducts = () => {
    if (isAndroid()) {
      const validProducts = window.CdvPurchase.store.products.filter(
        product =>
          product.offers.length > 0 &&
          AVAIABLE_PRODUCTS_ID.some(p => p.subscriptionId === product.id)
      );
      return this.setState({ products: validProducts });
    }

    const product = AVAIABLE_PRODUCTS_ID[0];
    const products = [
      {
        id: '1',
        title: 'Preimum full',
        offers: [
          {
            id: 'premiumfull@month',
            pricingPhases: [{ price: 'USD 6,00', billingPeriod: 'P1M' }]
          },
          {
            id: 'premiumfull@year',
            pricingPhases: [{ price: 'USD 50,00', billingPeriod: 'P1Y' }]
          }
        ]
      }
    ];
    this.setState({ products: products });
  };

  handleChange = name => event => {
    this.setState({
      ...this.state,
      [name]: event.target.value
    });
  };

  handleSubmit = async () => {};

  handleUpdateStore = () => {
    const { comprobeSubscription } = this.props;

    window.CdvPurchase.store.update();
    comprobeSubscription();
  };

  handleError = e => {
    const { updateSubscriptionError, updateSubscription } = this.props;

    console.log('Entro culiau');
    updateSubscriptionError({
      showError: true,
      message: e.message,
      code: e.code
    });

    updateSubscription({
      isSubscribed: false,
      expiryDate: null,
      androidSubscriptionState: 'not_subscribed'
    });

    setTimeout(() => {
      updateSubscriptionError({
        showError: false,
        message: '',
        code: ''
      });
    }, 3000);
  };

  handleSubscribe = (product, offer) => async event => {
    const {
      user,
      isLogged,
      location,
      updateSubscriberId,
      updateSubscription,
      subscription
    } = this.props;
    if (isAndroid()) {
      if (
        isLogged &&
        subscription.androidSubscriptionState === 'not_subscribed'
      ) {
        try {
          updateSubscription({
            isSubscribed: false,
            expiryDate: null,
            androidSubscriptionState: 'proccesing'
          });

          const subscriber = await API.getSubscriber(user.id);
          updateSubscriberId(subscriber._id);
          const order = await window.CdvPurchase.store.order(offer);
          if (order && order.isError) throw order;
        } catch (e) {
          if (e.response?.data.error === 'subscriber not found') {
            try {
              const newSubscriber = {
                userId: user.id,
                country: location.countryCode || 'Not localized',
                status: 'algo',
                product: {
                  planId: offer.id,
                  subscriptionId: product.id,
                  status: 'valid'
                }
              };
              const res = await API.createSubscriber(newSubscriber);
              updateSubscriberId(res._id);
              const order = await window.CdvPurchase.store.order(offer);
              if (order && order.isError) throw order;
            } catch (e) {
              console.error('Cannot subscribe product', e.message);
              this.handleError(e);
            }
          }
          console.error('Cannot subscribe product', e.message);
          this.handleError(e);
        }
      }
    }
  };

  render() {
    const { history, location } = this.props;

    return (
      <Subscribe
        onClose={history.goBack}
        isLogged={this.props.isLogged}
        subscribe={this.handleSubscribe}
        name={this.state.name}
        email={this.state.email}
        location={location}
        onSubmitPeople={this.handleSubmit}
        products={this.state.products}
        subscription={this.props.subscription}
        updateSubscriberId={this.props.updateSubscriberId}
        onUpdateStore={this.handleUpdateStore}
      />
    );
  }
}

const mapStateToProps = state => {
  const userIsLogged = isLogged(state);
  const user = getUser(state);
  const location = userIsLogged
    ? {
        country: user?.location?.country,
        countryCode: user?.location?.countryCode
      }
    : {
        country: state.app.unloggedUserLocation?.country,
        countryCode: state.app.unloggedUserLocation?.countryCode
      };
  return {
    isLogged: userIsLogged,
    user: user,
    location: location,
    subscription: state.subscription
  };
};

const mapDispatchToProps = {
  updateSubscriberId,
  updateSubscription,
  comprobeSubscription,
  updateAndroidSubscriptionState,
  updateSubscriptionError
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SubscribeContainer);
