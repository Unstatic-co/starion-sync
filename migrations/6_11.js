db = connect('');

// active connection & create webhook syncflow-failed

const datasources = db.datasources.find({ isDeleted: false });
datasources.forEach((datasource) => {
  const webhook = db.webhooks.findOne({
    dataSourceId: datasource._id.toString(),
  });
  if (!webhook) {
    return;
  }
  const webhookSyncflowFailed = db.webhooks.findOne({
    dataSourceId: datasource._id.toString(),
    type: 'syncflow-failed',
  });
  if (webhookSyncflowFailed) {
    return;
  }
  console.log(
    `create webhook syncflow-failed for datasource ${datasource._id}`,
  );
  db.webhooks.insertOne({
    isDeleted: false,
    dataSourceId: datasource._id.toString(),
    metadata: {
      teamId: webhook.metadata.teamId,
      tableId: webhook.metadata.tableId,
    },
    scope: 'datasource',
    assure: false,
    status: 'active',
    type: 'syncflow-failed',
    url: 'https://us-central1-starion-io.cloudfunctions.net/dataSourceWebhook/webhooks/syncflow-failed',
    updatedAt: '2023-10-23T10:02:19.764+00:00',
    createdAt: '2023-10-23T10:02:19.764+00:00',
  });
  const syncConnection = db.syncconnections.findOne({
    sourceId: datasource._id,
    isDeleted: false,
  });
  if (syncConnection && syncConnection.state.status === 'inactive') {
    console.log(`update syncconnection ${syncConnection._id} to active`);
    db.syncconnections.updateOne(
      {
        _id: syncConnection._id,
      },
      {
        $set: {
          'state.status': 'active',
        },
      },
    );
  }
});
