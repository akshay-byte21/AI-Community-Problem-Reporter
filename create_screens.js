const fs = require('fs');
const path = require('path');

const screens = [
  'TrackScreen',
  'ProfileScreen',
  'CameraScreen',
  'AIProcessingScreen',
  'ReviewComplaintScreen',
  'SubmitScreen',
  'StatusDetailsScreen'
];

screens.forEach(screen => {
  const content = `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ${screen} = ({ navigation, route }) => {
  return (
    <View style={styles.container}>
      <Text>${screen}</Text>
    </View>
  );
};
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', alignItems: 'center' } });
export default ${screen};
`;
  fs.writeFileSync(path.join(__dirname, 'frontend', 'src', 'screens', `${screen}.js`), content);
});
console.log('Screens created');
