import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CatalogScreen from '../screens/CatalogScreen';
import FoodDetailScreen from '../screens/FoodDetailScreen';
import CreateRequestScreen from '../screens/CreateRequestScreen';
import MyRequestsScreen from '../screens/MyRequestsScreen';
import DonationsScreen from '../screens/DonationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyFoodsScreen from '../screens/MyFoodsScreen';
import FoodFormScreen from '../screens/FoodFormScreen';
import IncomingRequestsScreen from '../screens/IncomingRequestsScreen';
import AdminScreen from '../screens/AdminScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.cream, primary: C.terra, card: C.paper, text: C.ink, border: C.line } };
const icon = (e) => ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{e}</Text>;
const tabOpts = { headerStyle: { backgroundColor: C.paper }, headerTitleStyle: { color: C.green, fontWeight: '800' }, tabBarActiveTintColor: C.terra };

function Tabs({ route }) {
  const role = route.params.role;
  if (role === 'donor') {
    return (
      <Tab.Navigator screenOptions={tabOpts}>
        <Tab.Screen name="MyFoods" component={MyFoodsScreen} options={{ title: 'Makanan Saya', tabBarIcon: icon('🍱') }} />
        <Tab.Screen name="Incoming" component={IncomingRequestsScreen} options={{ title: 'Permintaan', tabBarIcon: icon('📥') }} />
        <Tab.Screen name="Donations" component={DonationsScreen} options={{ title: 'Donasi', tabBarIcon: icon('📦') }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil', tabBarIcon: icon('👤') }} />
      </Tab.Navigator>
    );
  }
  if (role === 'admin') {
    return (
      <Tab.Navigator screenOptions={tabOpts}>
        <Tab.Screen name="Admin" component={AdminScreen} options={{ title: 'Ringkasan', tabBarIcon: icon('📊') }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil', tabBarIcon: icon('👤') }} />
      </Tab.Navigator>
    );
  }
  return (
    <Tab.Navigator screenOptions={tabOpts}>
      <Tab.Screen name="Catalog" component={CatalogScreen} options={{ title: 'Katalog', tabBarIcon: icon('🍽️') }} />
      <Tab.Screen name="MyRequests" component={MyRequestsScreen} options={{ title: 'Permintaan', tabBarIcon: icon('🧺') }} />
      <Tab.Screen name="Donations" component={DonationsScreen} options={{ title: 'Donasi', tabBarIcon: icon('📦') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil', tabBarIcon: icon('👤') }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, ready } = useAuth();
  if (!ready) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: C.cream }}><ActivityIndicator size="large" color={C.terra} /></View>;
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: C.paper }, headerTintColor: C.green }}>
        {user ? (
          <>
            <Stack.Screen name="Tabs" component={Tabs} initialParams={{ role: user.role }} options={{ headerShown: false }} />
            <Stack.Screen name="FoodDetail" component={FoodDetailScreen} options={{ title: 'Detail makanan' }} />
            <Stack.Screen name="CreateRequest" component={CreateRequestScreen} options={{ title: 'Ajukan permintaan' }} />
            <Stack.Screen name="FoodForm" component={FoodFormScreen} options={{ title: 'Makanan' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Daftar akun' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
