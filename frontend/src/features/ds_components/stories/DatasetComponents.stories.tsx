import React from 'react';
import { Provider } from 'react-redux';
import { Story, Meta } from '@storybook/react';

import { configureStore, history } from '../../../store/store';
import { ConnectedRouter } from 'connected-react-router';
import DatasetComponents from '../DatasetComponents';
import { NewDataset } from '../../../qri/dataset';
import earthquakes from './data/earthquakes.json'

export default {
  title: 'Workflow/DatasetComponents',
  component: DatasetComponents,
  argTypes: {},
} as Meta;

const Template: Story<any> = (args) => (
  <Provider store={configureStore()}>
    <ConnectedRouter history={history}>
      <DatasetComponents dataset={NewDataset(earthquakes)} />
    </ConnectedRouter>
  </Provider>
);

export const Basic = Template.bind({})
Basic.args = {
  label: 'Basic',
}

