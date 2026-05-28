// Chaos Studio experiment — Module 06 scenario C.
// Drains an entire zone of gateway-java Pods to validate that:
//   1. The remaining Pods absorb the reconnect storm from displaced sockets
//   2. PDB minAvailable=2 holds
//   3. Message RTT P99 recovers within 60 s after the storm
//
// Deploy:
//   az deployment group create -g <rg> -f zone-failure-experiment.bicep \
//     -p clusterName=<aks-name> zone=2 region=eus2
param location string = resourceGroup().location
param clusterName string
param zone string = '2'
param region string = 'eus2'
param experimentName string = 'skybridge-zone-failure'

resource aks 'Microsoft.ContainerService/managedClusters@2024-09-01' existing = {
  name: clusterName
}

resource target 'Microsoft.Chaos/targets@2024-01-01' = {
  name: 'Microsoft-AzureKubernetesServiceChaosMesh'
  scope: aks
  properties: {}
}

resource capability 'Microsoft.Chaos/targets/capabilities@2024-01-01' = {
  parent: target
  name: 'PodChaos-2.2'
  properties: {}
}

resource experiment 'Microsoft.Chaos/experiments@2024-01-01' = {
  name: experimentName
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    selectors: [
      {
        type: 'List'
        id: 'gateway-zone'
        targets: [
          {
            type: 'ChaosTarget'
            id: target.id
          }
        ]
      }
    ]
    steps: [
      {
        name: 'kill-gateway-zone-${zone}'
        branches: [
          {
            name: 'b1'
            actions: [
              {
                type: 'continuous'
                name: 'urn:csci:microsoft:azureKubernetesServiceChaosMesh:podChaos/2.2'
                duration: 'PT10M'
                selectorId: 'gateway-zone'
                parameters: [
                  {
                    key: 'jsonSpec'
                    // Target gateway-java Pods only, in the chosen AZ.
                    value: '{"action":"pod-failure","mode":"all","selector":{"namespaces":["messaging-prod"],"labelSelectors":{"app":"gateway-java","topology.kubernetes.io/zone":"${region}-${zone}"}}}'
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
