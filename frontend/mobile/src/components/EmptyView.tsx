import { View, Text, StyleSheet } from 'react-native'

interface Props {
  mensagem?: string
}

export default function EmptyView({ mensagem = 'Nenhum item encontrado.' }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{mensagem}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  text: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
  },
})
