import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>مرحباً بك في سباي</Text>
        <Text style={styles.heroSubtitle}>سوق سوريا الإلكتروني</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الفئات</Text>
        <View style={styles.categories}>
          {categories.map((cat) => (
            <TouchableOpacity key={cat.id} style={styles.categoryCard}>
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={styles.categoryName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>منتجات مميزة</Text>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.productCard}>
            <View style={styles.productImage} />
            <View style={styles.productInfo}>
              <Text style={styles.productTitle}>منتج تجريبي {i}</Text>
              <Text style={styles.productPrice}>١٠٠٫٠٠٠ ل.س</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Link href="/login" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>تسجيل الدخول</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}

const categories = [
  { id: '1', name: 'إلكترونيات', icon: '📱' },
  { id: '2', name: 'أزياء', icon: '👔' },
  { id: '3', name: 'منزل', icon: '🏠' },
  { id: '4', name: 'سيارات', icon: '🚗' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  hero: {
    backgroundColor: '#3b82f6',
    padding: 40,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'right',
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: 80,
    height: 80,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  footer: {
    padding: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
