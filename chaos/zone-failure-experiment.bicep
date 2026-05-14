// Chaos Studio experiment that simulates a zone failure by cordoning all
// nodes in a target zone. Used by Module 06 scenario 6D.
//
// Deploy: az deployment group create -g <rg> -f zone-failure-experiment.bicep \
//          -p clusterName=<aks-name> zone=2
param location string = resourceGroup().location
param clusterName string
param zone string = '2'
param experimentName string = 'sita-zone-failure'

resource aks 'Microsoft.ContainerService/managedClusters@2024-09-01' existing = {
  name: clusterName
}

// Onboard the AKS cluster as a Chaos target (idempotent)
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
        id: 'aks-cluster'
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
        name: 'cordon-zone-${zone}'
        branches: [
          {
            name: 'b1'
            actions: [
              {
                type: 'continuous'
                name: 'urn:csci:microsoft:azureKubernetesServiceChaosMesh:podChaos/2.2'
                duration: 'PT10M'
                selectorId: 'aks-cluster'
                parameters: [
                  {
                    key: 'jsonSpec'
                    value: '{"action":"pod-failure","mode":"all","selector":{"labelSelectors":{"topology.kubernetes.io/zone":"westus3-${zone}"}}}'
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
